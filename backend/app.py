# backend/app.py
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime
import requests
from werkzeug.security import generate_password_hash, check_password_hash
from services.outfit_generator import OutfitGenerator
from services.analytics import WardrobeAnalytics
from services.weather_service import WeatherService

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key')

# Allow all origins in dev; on Render set CORS_ORIGINS env var to your frontend URL
cors_origins = os.environ.get('CORS_ORIGINS', '*')
CORS(app, supports_credentials=True, origins=cors_origins)

# Database connection
def get_db():
    database_url = os.environ.get('DATABASE_URL')
    if database_url:
        # Render provides postgresql://, psycopg2 needs postgresql:// (same thing)
        conn = psycopg2.connect(database_url)
    else:
        conn = psycopg2.connect(
            host=os.environ.get('DB_HOST', 'localhost'),
            database=os.environ.get('DB_NAME', 'wardrobewizard'),
            user=os.environ.get('DB_USER', 'postgres'),
            password=os.environ.get('DB_PASSWORD', 'password')
        )
    return conn

# Routes
@app.route('/api/items', methods=['GET', 'POST'])
def handle_items():
    conn = get_db()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    # For demo purposes, we'll use a hardcoded user_id if not in session
    user_id = session.get('user_id', 1) 
    
    if request.method == 'GET':
        cur.execute("SELECT * FROM clothing_items WHERE user_id = %s ORDER BY created_at DESC", (user_id,))
        items = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify(items)
    
    elif request.method == 'POST':
        data = request.json
        cur.execute("""
            INSERT INTO clothing_items 
            (user_id, name, category, subcategory, color_primary, color_secondary, 
             pattern, style, season, image_url, brand)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            user_id, data['name'], data['category'], data.get('subcategory'),
            data['color_primary'], data.get('color_secondary'),
            data.get('pattern', 'solid'), data['style'],
            data.get('season', ['all']), data['image_url'], data.get('brand')
        ))
        
        item_id = cur.fetchone()['id']
        conn.commit()
        cur.close()
        conn.close()
        
        return jsonify({'id': item_id, 'message': 'Item added successfully'})

@app.route('/api/outfits/generate', methods=['POST'])
def generate_outfits():
    """Generate outfit combinations based on user's wardrobe"""
    user_id = session.get('user_id', 1)
    data = request.json
    occasion = data.get('occasion', 'casual')
    weather = data.get('weather', {})
    
    generator = OutfitGenerator(user_id)
    outfits = generator.generate_combinations(occasion=occasion, weather=weather, limit=5)
    
    return jsonify(outfits)

@app.route('/api/analytics/wardrobe', methods=['GET'])
def wardrobe_analytics():
    """Get wardrobe analytics and insights"""
    user_id = session.get('user_id', 1)
    analytics = WardrobeAnalytics(user_id)
    
    return jsonify({
        'most_worn': analytics.get_most_worn(10),
        'unused_items': analytics.get_unused_items(30),
        'color_distribution': analytics.get_color_distribution(),
        'category_breakdown': analytics.get_category_breakdown(),
        'gaps': analytics.identify_gaps()
    })

@app.route('/api/weather', methods=['GET'])
def get_weather():
    lat = request.args.get('lat')
    lon = request.args.get('lon')
    if not lat or not lon:
        return jsonify({'error': 'Missing coordinates'}), 400
    
    weather_service = WeatherService()
    weather = weather_service.get_weather(lat, lon)
    return jsonify(weather)

@app.route('/api/analyze-clothing', methods=['POST'])
def analyze_clothing():
    # This would typically save the file and call the ML service
    # For now, we'll return a mock response or call a basic version
    from ml.clothing_classifier import ClothingClassifier
    
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400
    
    image = request.files['image']
    # Save image temporarily
    temp_path = f"temp_{image.filename}"
    image.save(temp_path)
    
    classifier = ClothingClassifier()
    analysis = classifier.classify_item(temp_path)
    
    # Cleanup
    os.remove(temp_path)
    
    return jsonify(analysis)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
