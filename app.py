from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# MongoDB Configuration
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI)
db = client['FoodAtliss']
print("Connected to MongoDB at", MONGO_URI)
# Collections
restaurants_collection = db['restaurants']
categories_collection = db['categories']
reviews_collection = db['reviews']

# Helper function
def serialize_doc(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

# ============ MAIN ROUTES ============

@app.route('/')
def index():
    """Serve the main homepage"""
    return render_template('index.html')

@app.route('/map')
def map_page():
    """Serve the map page"""
    return render_template('mapbox.html')

@app.route('/mappage')
def map_page_alt():
    """Alternative route for map page"""
    return render_template('mapbox.html')

@app.route('/addspotpage')
def add_spot_page():
    """Serve the add spot page"""
    return render_template('add-spot.html')

# ============ RESTAURANT ROUTES ============

@app.route('/api/restaurants', methods=['GET'])
def get_restaurants():
    """Get all restaurants or filter by category/cuisine/location"""
    try:
        category = request.args.get('category')
        cuisine = request.args.get('cuisine')
        search = request.args.get('search')
        location = request.args.get('location')
        
        query = {}
        
        if category and category != 'All':
            query['category'] = category
        
        if cuisine:
            query['cuisine'] = {'$regex': cuisine, '$options': 'i'}
        
        if location:
            query['address'] = {'$regex': location, '$options': 'i'}
        
        if search:
            query['$or'] = [
                {'name': {'$regex': search, '$options': 'i'}},
                {'description': {'$regex': search, '$options': 'i'}},
                {'cuisine': {'$regex': search, '$options': 'i'}},
                {'address': {'$regex': search, '$options': 'i'}}
            ]
        
        restaurants = list(restaurants_collection.find(query))
        return jsonify([serialize_doc(r) for r in restaurants]), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/restaurants/<restaurant_id>', methods=['GET'])
def get_restaurant(restaurant_id):
    """Get a specific restaurant by ID"""
    try:
        restaurant = restaurants_collection.find_one({'_id': ObjectId(restaurant_id)})
        if restaurant:
            return jsonify(serialize_doc(restaurant)), 200
        return jsonify({'error': 'Restaurant not found'}), 404
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/restaurants', methods=['POST'])
def add_restaurant():
    """Add a new restaurant"""
    try:
        data = request.json
        
        required_fields = ['name', 'lat', 'lng', 'cuisine', 'description']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        data['created_at'] = datetime.utcnow()
        data['updated_at'] = datetime.utcnow()
        
        if 'rating' not in data:
            data['rating'] = 0
        if 'review_count' not in data:
            data['review_count'] = 0
        
        result = restaurants_collection.insert_one(data)
        return jsonify({
            'message': 'Restaurant added successfully',
            'id': str(result.inserted_id)
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/restaurants/<restaurant_id>', methods=['PUT'])
def update_restaurant(restaurant_id):
    """Update a restaurant"""
    try:
        data = request.json
        data['updated_at'] = datetime.utcnow()
        
        result = restaurants_collection.update_one(
            {'_id': ObjectId(restaurant_id)},
            {'$set': data}
        )
        
        if result.modified_count > 0:
            return jsonify({'message': 'Restaurant updated successfully'}), 200
        return jsonify({'error': 'Restaurant not found or no changes made'}), 404
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/restaurants/<restaurant_id>', methods=['DELETE'])
def delete_restaurant(restaurant_id):
    """Delete a restaurant"""
    try:
        result = restaurants_collection.delete_one({'_id': ObjectId(restaurant_id)})
        
        if result.deleted_count > 0:
            reviews_collection.delete_many({'restaurant_id': restaurant_id})
            return jsonify({'message': 'Restaurant deleted successfully'}), 200
        return jsonify({'error': 'Restaurant not found'}), 404
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ CATEGORY ROUTES ============

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Get all categories"""
    try:
        categories = list(categories_collection.find())
        return jsonify([serialize_doc(c) for c in categories]), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories', methods=['POST'])
def add_category():
    """Add a new category"""
    try:
        data = request.json
        
        if 'name' not in data:
            return jsonify({'error': 'Category name is required'}), 400
        
        result = categories_collection.insert_one(data)
        return jsonify({
            'message': 'Category added successfully',
            'id': str(result.inserted_id)
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ REVIEW ROUTES ============

@app.route('/api/restaurants/<restaurant_id>/reviews', methods=['GET'])
def get_reviews(restaurant_id):
    """Get all reviews for a restaurant"""
    try:
        reviews = list(reviews_collection.find({'restaurant_id': restaurant_id}).sort('created_at', -1))
        return jsonify([serialize_doc(r) for r in reviews]), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/restaurants/<restaurant_id>/reviews', methods=['POST'])
def add_review(restaurant_id):
    """Add a review for a restaurant"""
    try:
        data = request.json
        data['restaurant_id'] = restaurant_id
        data['created_at'] = datetime.utcnow()
        
        if 'rating' not in data or 'comment' not in data:
            return jsonify({'error': 'Rating and comment are required'}), 400
        
        if data['rating'] < 1 or data['rating'] > 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        
        result = reviews_collection.insert_one(data)
        
        all_reviews = list(reviews_collection.find({'restaurant_id': restaurant_id}))
        avg_rating = sum(r['rating'] for r in all_reviews) / len(all_reviews)
        
        restaurants_collection.update_one(
            {'_id': ObjectId(restaurant_id)},
            {'$set': {
                'rating': round(avg_rating, 1),
                'review_count': len(all_reviews)
            }}
        )
        
        return jsonify({
            'message': 'Review added successfully',
            'id': str(result.inserted_id),
            'new_avg_rating': round(avg_rating, 1)
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ SEARCH ROUTE ============

@app.route('/api/search', methods=['GET'])
def search():
    """Advanced search endpoint"""
    try:
        query_text = request.args.get('q', '')
        
        if not query_text:
            return jsonify([]), 200
        
        query = {
            '$or': [
                {'name': {'$regex': query_text, '$options': 'i'}},
                {'cuisine': {'$regex': query_text, '$options': 'i'}},
                {'description': {'$regex': query_text, '$options': 'i'}},
                {'address': {'$regex': query_text, '$options': 'i'}},
                {'category': {'$regex': query_text, '$options': 'i'}}
            ]
        }
        
        results = list(restaurants_collection.find(query).limit(20))
        return jsonify([serialize_doc(r) for r in results]), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ UTILITY ROUTES ============

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get database statistics"""
    try:
        stats = {
            'total_restaurants': restaurants_collection.count_documents({}),
            'total_categories': categories_collection.count_documents({}),
            'total_reviews': reviews_collection.count_documents({}),
            'avg_rating': 0,
            'top_rated': []
        }
        
        # Calculate average rating
        pipeline = [
            {'$group': {'_id': None, 'avg_rating': {'$avg': '$rating'}}}
        ]
        result = list(restaurants_collection.aggregate(pipeline))
        if result:
            stats['avg_rating'] = round(result[0]['avg_rating'], 1)
        
        # Get top 5 rated restaurants
        top_rated = list(restaurants_collection.find().sort('rating', -1).limit(5))
        stats['top_rated'] = [{'name': r['name'], 'rating': r['rating']} for r in top_rated]
        
        return jsonify(stats), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ DATABASE INFO ROUTE ============

@app.route('/api/db-info', methods=['GET'])
def get_db_info():
    """Get information about what's in the database"""
    try:
        collections_info = {
            'database': 'FoodAtliss',
            'collections': {
                'restaurants': {
                    'count': restaurants_collection.count_documents({}),
                    'sample': list(restaurants_collection.find().limit(3))
                },
                'categories': {
                    'count': categories_collection.count_documents({}),
                    'sample': list(categories_collection.find().limit(3))
                },
                'reviews': {
                    'count': reviews_collection.count_documents({}),
                    'sample': list(reviews_collection.find().limit(3))
                }
            }
        }
        
        # Serialize all documents
        for collection_name in collections_info['collections']:
            collections_info['collections'][collection_name]['sample'] = [
                serialize_doc(doc) for doc in collections_info['collections'][collection_name]['sample']
            ]
        
        return jsonify(collections_info), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ ERROR HANDLERS ============

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ============ MAIN ============

if __name__ == '__main__':
    print(" Starting Food Atlas Server...")
    print(" Database: FoodAtliss")
    print(" Server running at: http://localhost:5000")
    print("\n Available Endpoints:")
    print("    Homepage: http://localhost:5000")
    print("     Map Page: http://localhost:5000/map")
    print("    Stats: http://localhost:5000/api/stats")
    print("    DB Info: http://localhost:5000/api/db-info")
    print("    Restaurants: http://localhost:5000/api/restaurants")
    print("    Categories: http://localhost:5000/api/categories")
    print("\n Note: All data is loaded from MongoDB database 'FoodAtliss'")
    print("   Make sure your MongoDB has restaurants and categories data!")
    
    app.run(debug=True, host='0.0.0.0', port=5000)