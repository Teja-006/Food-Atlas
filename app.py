from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Secret key for session management
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-in-production')

# MongoDB Configuration
MONGO_URI = 'mongodb://localhost:27017/'
client = MongoClient(MONGO_URI)
db = client['FoodAtlas']
print("✅ Connected to MongoDB at", MONGO_URI)

# Collections
restaurants_collection = db['restaurants']
users_collection = db['users']

# Helper function to serialize MongoDB documents
def serialize_doc(doc):
    if doc and '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc

# ============ AUTHENTICATION ROUTES ============
@app.route('/')
def loginpage():
    """Serve the login page"""
    return render_template('loginpage.html')

@app.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.json
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Check if user already exists
        existing_user = users_collection.find_one({'email': data['email']})
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 400
        
        # Create new user (password saved normally)
        user = {
            'name': data.get('name', ''),
            'email': data['email'],
            'password': data['password'],
            'created_at': datetime.utcnow()
        }
        
        result = users_collection.insert_one(user)
        
        # Set session
        session['user_id'] = str(result.inserted_id)
        session['user_email'] = data['email']
        session['user_name'] = data.get('name', '')
        
        return jsonify({
            'message': 'Registration successful',
            'user_id': str(result.inserted_id)
        }), 201
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    """Login user"""
    try:
        data = request.json
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user
        user = users_collection.find_one({'email': data['email']})
        
        if not user:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check password (no hash)
        if user['password'] != data['password']:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Set session
        session['user_id'] = str(user['_id'])
        session['user_email'] = user['email']
        session['user_name'] = user.get('name', '')
        
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': str(user['_id']),
                'email': user['email'],
                'name': user.get('name', '')
            }
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/logout', methods=['POST'])
def logout():
    """Logout user"""
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/check-auth', methods=['GET'])
def check_auth():
    """Check if user is authenticated"""
    if 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': session['user_id'],
                'email': session['user_email'],
                'name': session.get('user_name', '')
            }
        }), 200
    return jsonify({'authenticated': False}), 401

# ============ PAGE ROUTES ============
@app.route('/homepage')
def homepage():
    """Serve the main homepage"""
    return render_template('index.html')

@app.route('/mappage')
def map_page():
    """Serve the map page"""
    return render_template('mapbox.html')

@app.route('/addspotpage')
def add_spot_page():
    """Serve the add spot page"""
    return render_template('add-spot.html')

# ============ RESTAURANT API ROUTES ============
@app.route('/api/restaurants', methods=['GET'])
def get_restaurants():
    """Get all restaurants with optional filters"""
    try:
        category = request.args.get('category')
        cuisine = request.args.get('cuisine')
        search = request.args.get('search')
        location = request.args.get('location')
        limit = int(request.args.get('limit', 0))

        query = {}

        if category and category.lower() != 'all':
            query['category'] = {'$regex': category, '$options': 'i'}
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

        cursor = restaurants_collection.find(query).sort('rating', -1)
        if limit > 0:
            cursor = cursor.limit(limit)

        restaurants = list(cursor)
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
        
        # Add user info if logged in
        if 'user_id' in session:
            data['added_by'] = session['user_id']
        
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
            return jsonify({'message': 'Restaurant deleted successfully'}), 200
        return jsonify({'error': 'Restaurant not found'}), 404
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============ SEARCH & STATS ============
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

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get database statistics"""
    try:
        stats = {
            'total_restaurants': restaurants_collection.count_documents({}),
            'total_users': users_collection.count_documents({}),
            'avg_rating': 0,
            'top_rated': []
        }
        
        pipeline = [{'$group': {'_id': None, 'avg_rating': {'$avg': '$rating'}}}]
        result = list(restaurants_collection.aggregate(pipeline))
        if result:
            stats['avg_rating'] = round(result[0]['avg_rating'], 1)
        
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
    print("\n🌐 Server running at: http://localhost:5000\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
