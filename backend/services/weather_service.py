# backend/services/weather_service.py
import requests
import os
from datetime import datetime

class WeatherService:
    def __init__(self):
        self.api_key = os.environ.get('OPENWEATHER_API_KEY')
        self.base_url = "http://api.openweathermap.org/data/2.5"
    
    def get_weather(self, lat, lon):
        """Get current weather for location"""
        url = f"{self.base_url}/weather"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': self.api_key,
            'units': 'metric'
        }
        
        response = requests.get(url, params=params)
        return response.json()
    
    def get_forecast(self, lat, lon, days=5):
        """Get weather forecast"""
        url = f"{self.base_url}/forecast"
        params = {
            'lat': lat,
            'lon': lon,
            'appid': self.api_key,
            'units': 'metric',
            'cnt': days * 8  # 8 forecasts per day
        }
        
        response = requests.get(url, params=params)
        return response.json()
    
    def get_outfit_recommendations(self, weather):
        """Get outfit recommendations based on weather"""
        temp = weather['main']['temp']
        condition = weather['weather'][0]['main'].lower()
        
        recommendations = {
            'temperature_advice': '',
            'weather_advice': '',
            'suggested_items': []
        }
        
        # Temperature based advice
        if temp > 25:
            recommendations['temperature_advice'] = "It's hot! Wear lightweight, breathable fabrics."
            recommendations['suggested_items'].extend(['t-shirt', 'shorts', 'sundress', 'sandals'])
        elif temp < 10:
            recommendations['temperature_advice'] = "It's cold! Layer up with warm clothing."
            recommendations['suggested_items'].extend(['sweater', 'jacket', 'boots', 'scarf'])
        else:
            recommendations['temperature_advice'] = "Mild weather - comfortable for most outfits."
            recommendations['suggested_items'].extend(['jeans', 'long-sleeve shirt', 'light jacket'])
        
        # Weather condition based advice
        if 'rain' in condition:
            recommendations['weather_advice'] = "Rain expected - bring waterproof items."
            recommendations['suggested_items'].extend(['raincoat', 'umbrella', 'waterproof boots'])
        elif 'snow' in condition:
            recommendations['weather_advice'] = "Snow expected - wear warm, waterproof items."
            recommendations['suggested_items'].extend(['winter coat', 'snow boots', 'hat', 'gloves'])
        elif 'clear' in condition:
            recommendations['weather_advice'] = "Clear skies - perfect for any outfit!"
        
        return recommendations
