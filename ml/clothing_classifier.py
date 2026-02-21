# ml/clothing_classifier.py
import torch
import torchvision.transforms as transforms
from PIL import Image
import numpy as np
from sklearn.cluster import KMeans
import webcolors
import os

class ClothingClassifier:
    def __init__(self):
        # Load pre-trained model (using ResNet for demo)
        # Note: In a production environment, you might want to load this once
        try:
            self.model = torch.hub.load('pytorch/vision', 'resnet18', pretrained=True)
            self.model.eval()
        except Exception as e:
            print(f"Error loading model: {e}")
            self.model = None
        
        # Categories for clothing
        self.categories = [
            't-shirt', 'jeans', 'dress', 'jacket', 'shoes',
            'hat', 'scarf', 'skirt', 'shorts', 'sweater'
        ]
        
        # Style classifier (simplified - would need proper training)
        self.styles = {
            'formal': ['suit', 'blazer', 'dress_shirt'],
            'casual': ['t-shirt', 'jeans', 'sneakers'],
            'athletic': ['sweatpants', 'hoodie', 'gym_shoes']
        }
    
    def classify_item(self, image_path):
        """Main classification function"""
        try:
            image = Image.open(image_path).convert('RGB')
        except Exception:
            return {'error': 'Invalid image'}
        
        category = 't-shirt' # Fallback
        confidence = 0.0
        
        if self.model:
            # Preprocess for model
            preprocess = transforms.Compose([
                transforms.Resize(256),
                transforms.CenterCrop(224),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            input_tensor = preprocess(image)
            input_batch = input_tensor.unsqueeze(0)
            
            # Get prediction
            with torch.no_grad():
                output = self.model(input_batch)
            
            # Get top category (simplified - would need fine-tuning)
            probabilities = torch.nn.functional.softmax(output[0], dim=0)
            top_prob, top_cat = torch.max(probabilities, 0)
            category = self.categories[top_cat % len(self.categories)]
            confidence = float(top_prob)
        
        # Extract colors
        colors = self.extract_colors(image)
        
        # Detect pattern
        pattern = self.detect_pattern(image)
        
        # Detect style
        style = self.detect_style(image, category)
        
        return {
            'category': category,
            'confidence': confidence,
            'colors': colors,
            'pattern': pattern,
            'style': style
        }
    
    def extract_colors(self, image, n_colors=3):
        """Extract dominant colors from image"""
        # Resize for faster processing
        image_small = image.resize((150, 150))
        img_array = np.array(image_small)
        pixels = img_array.reshape(-1, 3)
        
        # Use K-means to find dominant colors
        kmeans = KMeans(n_clusters=n_colors, random_state=42)
        kmeans.fit(pixels)
        
        colors = []
        for center in kmeans.cluster_centers_:
            # Convert RGB to color name
            color_name = self.rgb_to_name(center.astype(int))
            colors.append(color_name)
        
        return colors
    
    def rgb_to_name(self, rgb):
        """Convert RGB to closest color name"""
        try:
            # Try exact match
            return webcolors.rgb_to_name(rgb)
        except ValueError:
            # Find closest color
            min_colors = {}
            for key, name in webcolors.CSS3_HEX_TO_NAMES.items():
                r_c, g_c, b_c = webcolors.hex_to_rgb(key)
                rd = (r_c - rgb[0]) ** 2
                gd = (g_c - rgb[1]) ** 2
                bd = (b_c - rgb[2]) ** 2
                min_colors[(rd + gd + bd)] = name
            return min_colors[min(min_colors.keys())]
    
    def detect_pattern(self, image):
        """Detect if clothing has pattern (simplified)"""
        # Convert to grayscale
        gray = image.convert('L')
        img_array = np.array(gray)
        
        # Calculate local variance
        from scipy import ndimage
        # Using a simpler variance calculation for speed/reduced dependencies if needed, 
        # but scipy ndimage is in requirements.
        try:
            variance = ndimage.generic_filter(img_array, np.var, size=5)
            # If variance is high, likely has pattern
            if np.mean(variance) > 1000:
                return 'patterned'
        except Exception:
            pass
            
        return 'solid'
    
    def detect_style(self, image, category):
        """Detect clothing style (simplified)"""
        # In production, this would use a trained classifier
        # For demo, return based on color and category
        if category in ['dress', 'skirt']:
            return 'formal'
        if category in ['jeans', 't-shirt']:
            return 'casual'
        return 'casual'  # Default
