from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend-backend communication

# MongoDB Configuration - Using your FoodAtlss database
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI)
db = client['FoodAtliss']  # Your database name from MongoDB Compass

# Collections
restaurants_collection = db['restaurants']
categories_collection = db['categories']
reviews_collection = db['reviews']

# Helper function to convert ObjectId to string
def serialize_doc(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

# ============ ROUTES ============

@app.route('/')
def index():
    """Serve the main homepage"""
    return render_template('index.html')

@app.route('/map')
def map_page():
    """Serve the map page"""
    return render_template('mapbox.html')

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
        
        # Validate required fields
        required_fields = ['name', 'lat', 'lng', 'cuisine', 'description']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Add timestamp
        data['created_at'] = datetime.utcnow()
        data['updated_at'] = datetime.utcnow()
        
        # Set default values if not provided
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
            # Also delete associated reviews
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
        
        # Validate required fields
        if 'rating' not in data or 'comment' not in data:
            return jsonify({'error': 'Rating and comment are required'}), 400
        
        # Validate rating range
        if data['rating'] < 1 or data['rating'] > 5:
            return jsonify({'error': 'Rating must be between 1 and 5'}), 400
        
        result = reviews_collection.insert_one(data)
        
        # Update restaurant's average rating
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
        
        # Create text search query
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

@app.route('/api/seed', methods=['POST'])
def seed_database():
    """Seed the database with initial data"""
    try:
        # Clear existing data
        restaurants_collection.delete_many({})
        categories_collection.delete_many({})
        reviews_collection.delete_many({})
        
        # Insert categories
        categories = [
            {'name': 'All', 'description': 'All restaurants', 'image': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4'},
            {'name': 'Biryani', 'description': 'Aromatic rice dishes', 'image': 'https://images.unsplash.com/photo-1563245372-f21724e3856d'},
            {'name': 'South Indian', 'description': 'Dosas, Idlis and more', 'image': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe'},
            {'name': 'Vegetarian', 'description': 'Pure vegetarian cuisine', 'image': 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe'},
            {'name': 'Seafood', 'description': 'Fresh from the ocean', 'image': 'https://images.unsplash.com/photo-1559737558-2f5a35f4523e'},
            {'name': 'Barbecue', 'description': 'Grilled perfection', 'image': 'https://images.unsplash.com/photo-1544025162-d76694265947'},
            {'name': 'Italian', 'description': 'Pizza, Pasta and more', 'image': 'https://images.unsplash.com/photo-1513104890138-7c749659a591'},
            {'name': 'Mediterranean', 'description': 'Healthy and fresh', 'image': 'https://images.unsplash.com/photo-1516685018646-549198525c1b'},
            {'name': 'Chinese', 'description': 'Asian flavors', 'image': 'https://images.unsplash.com/photo-1563245372-f21724e3856d'},
            {'name': 'Fast Food', 'description': 'Quick bites', 'image': 'https://images.unsplash.com/photo-1571091718767-18b5b1457add'},
            {'name': 'Cafe', 'description': 'Coffee and desserts', 'image': 'https://images.unsplash.com/photo-1511920170033-f8396924c348'}
        ]
        categories_collection.insert_many(categories)
        
        # Insert restaurants (Woxsen area)
        restaurants = [
            {
                'name': 'Woxsen Bistro',
                'lat': 17.7033,
                'lng': 78.0490,
                'description': 'A cozy bistro with a variety of dishes. Perfect for students and faculty.',
                'cuisine': 'Multi-cuisine, Bakery, Cafe',
                'category': 'Multi-cuisine',
                'rating': 4.2,
                'review_count': 156,
                'hours': '8:00 AM - 10:00 PM',
                'address': 'Woxsen University Campus, Sangareddy',
                'phone': '+91 9876543210',
                'price_range': '₹₹',
                'image': 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
                'created_at': datetime.utcnow()
            },
            {
                'name': 'Sangareddy Spice',
                'lat': 17.7015,
                'lng': 78.0475,
                'description': 'Serving delicious Indian flavors with authentic Hyderabadi biryani.',
                'cuisine': 'Indian, Hyderabadi, Biryani',
                'category': 'Biryani',
                'rating': 4.7,
                'review_count': 342,
                'hours': '11:00 AM - 11:00 PM',
                'address': 'Market Road, Sangareddy',
                'phone': '+91 9876543211',
                'price_range': '₹₹₹',
                'image': 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0',
                'created_at': datetime.utcnow()
            },
            {
                'name': 'The Green Plate',
                'lat': 17.7050,
                'lng': 78.0500,
                'description': 'A vegetarian-friendly cafe with organic and healthy options.',
                'cuisine': 'Vegetarian, Organic, Healthy',
                'category': 'Vegetarian',
                'rating': 4.3,
                'review_count': 89,
                'hours': '9:00 AM - 9:00 PM',
                'address': 'College Road, Sangareddy',
                'phone': '+91 9876543212',
                'price_range': '₹₹',
                'image': 'https://images.unsplash.com/photo-1516685018646-549198525c1b',
                'created_at': datetime.utcnow()
            },
            {
                'name': 'BBQ Corner',
                'lat': 17.7000,
                'lng': 78.0460,
                'description': 'Barbecue and grilled food with Chinese fusion.',
                'cuisine': 'Barbecue, Grill, Chinese',
                'category': 'Barbecue',
                'rating': 4.4,
                'review_count': 203,
                'hours': '12:00 PM - 10:00 PM',
                'address': 'Highway Junction, Sangareddy',
                'phone': '+91 9876543213',
                'price_range': '₹₹',
                'image': 'https://images.unsplash.com/photo-1432139509613-5c4255815697',
                'created_at': datetime.utcnow()
            },
            {
                'name': 'Café Wox',
                'lat': 17.7060,
                'lng': 78.0510,
                'description': 'A coffee shop with a beautiful ambiance. Perfect for study sessions.',
                'cuisine': 'Cafe, Coffee, Desserts',
                'category': 'Cafe',
                'rating': 4.8,
                'review_count': 278,
                'hours': '7:00 AM - 9:00 PM',
                'address': 'Woxsen Campus, Sangareddy',
                'phone': '+91 9876543214',
                'price_range': '₹₹',
                'image': 'https://images.unsplash.com/photo-1511920170033-f8396924c348',
                'created_at': datetime.utcnow()
            },
            # Hyderabad restaurants
            {
                'name': 'Paradise Biryani',
                'lat': 17.4399,
                'lng': 78.4744,
                'description': 'Famous for authentic Hyderabadi biryani since 1953.',
                'cuisine': 'Biryani, Hyderabadi',
                'category': 'Biryani',
                'rating': 4.6,
                'review_count': 5432,
                'hours': '11:00 AM - 11:00 PM',
                'address': 'Shop 1, RTC Cross Roads, Hyderabad',
                'phone': '+91 9876543215',
                'price_range': '₹₹₹',
                'image': 'https://images.unsplash.com/photo-1563245372-f21724e3856d',
                'created_at': datetime.utcnow()
            },
            {
                'name': 'Bawarchi',
                'lat': 17.4146,
                'lng': 78.4747,
                'description': 'Legendary biryani spot in the heart of Hyderabad.',
                'cuisine': 'Biryani, North Indian',
                'category': 'Biryani',
                'rating': 4.1,
                'review_count': 3210,
                'hours': '11:30 AM - 11:30 PM',
                'address': 'Hill Fort Rd, RTC Cross Roads, Hyderabad',
                'phone': '+91 9876543216',
                'price_range': '₹₹',
                'image': 'https://images.unsplash.com/photo-1563245372-f21724e3856d',
                'created_at': datetime.utcnow()
            },
            {
                'name': 'Chutneys',
                'lat': 17.4297,
                'lng': 78.4867,
                'description': 'Wide variety of South Indian breakfast and snacks.',
                'cuisine': 'South Indian',
                'category': 'South Indian',
                'rating': 4.3,
                'review_count': 1876,
                'hours': '7:00 AM - 10:00 PM',
                'address': 'Road No 10, Banjara Hills, Hyderabad',
                'phone': '+91 9876543217',
                'price_range': '₹₹',
                'image': 'https://images.unsplash.com/photo-1630383249896-424e482df921',
                'created_at': datetime.utcnow()
            },
            {
                'name': "Ohri's Jiva",
                'lat': 17.4320,
                'lng': 78.4833,
                'description': 'Premium Mediterranean cuisine with live music.',
                'cuisine': 'Mediterranean, Continental',
                'category': 'Mediterranean',
                'rating': 4.2,
                'review_count': 987,
                'hours': '12:00 PM - 11:00 PM',
                'address': 'Road No. 12, Banjara Hills, Hyderabad',
                'phone': '+91 9876543218',
                'price_range': '₹₹₹₹',
                'image': 'https://images.unsplash.com/photo-1544148103-0773bf10d330',
                'created_at': datetime.utcnow()
            },
            {
                'name': 'Kebab Studio',
                'lat': 17.4260,
                'lng': 78.4807,
                'description': 'Authentic barbecue and kebabs with great ambiance.',
                'cuisine': 'Barbecue, Kebabs',
                'category': 'Barbecue',
                'rating': 4.5,
                'review_count': 1543,
                'hours': '6:00 PM - 11:30 PM',
                'address': 'Road No 36, Jubilee Hills, Hyderabad',
                'phone': '+91 9876543219',
                'price_range': '₹₹₹',
                'image': 'https://images.unsplash.com/photo-1529042410759-befb1204b468',
                'created_at': datetime.utcnow()
            }
        ]
        restaurants_collection.insert_many(restaurants)
        
        return jsonify({
            'message': 'Database seeded successfully',
            'restaurants_added': len(restaurants),
            'categories_added': len(categories)
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

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
        
        # Calculate average rating across all restaurants
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

# ============ ERROR HANDLERS ============

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ============ MAIN ============

if __name__ == '__main__':
    print("🚀 Starting Food Atlas Server...")
    print("📊 Database: FoodAtlss")
    print("🌐 Server running at: http://localhost:5000")
    print("📡 API Documentation: http://localhost:5000/api/stats")
    print("\n💡 Quick Start:")
    print("   1. Seed database: POST http://localhost:5000/api/seed")
    print("   2. View stats: GET http://localhost:5000/api/stats")
    print("   3. Get restaurants: GET http://localhost:5000/api/restaurants")
    
    app.run(debug=True, host='0.0.0.0', port=5000)