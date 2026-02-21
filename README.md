# WardrobeWizard 🪄👗

An AI-powered personal stylist application that helps you manage your wardrobe, generate outfits, and get weather-aware fashion advice.

## Features

- **AI Clothing Scanner** – Upload photos; AI classifies category, color, and pattern automatically
- **Smart Outfit Generator** – Get outfit recommendations based on occasion and weather
- **Weather Integration** – Connects to OpenWeather API for real-time styling advice
- **Wardrobe Analytics** – Visualize your wardrobe composition and identify gaps
- **Shopping Suggestions** – AI-driven recommendations for missing wardrobe pieces

## Project Structure

```
project6/
├── frontend/           # HTML/CSS/JS (served via Nginx)
│   ├── index.html
│   ├── js/app.js
│   └── Dockerfile
├── backend/            # Python Flask API
│   ├── app.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── services/
│       ├── outfit_generator.py
│       ├── weather_service.py
│       └── analytics.py
├── ml/                 # ML Clothing Classifier
│   └── clothing_classifier.py
├── database/
│   └── schema.sql
├── docker-compose.yml
└── .env.example
```

## Quick Start (Docker)

### 1. Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### 2. Configure Environment

```bash
# Copy and edit the environment file
cp .env.example .env
```

Edit `.env` and set:

- `OPENWEATHER_API_KEY` — Get a free key at [openweathermap.org](https://openweathermap.org/api)
- `SECRET_KEY` — Any random string for session security

### 3. Run with Docker Compose

```bash
docker-compose up -d
```

### 4. Access the App

| Service  | URL                   |
| -------- | --------------------- |
| Frontend | http://localhost      |
| Backend  | http://localhost:5000 |
| Database | localhost:5432        |

## Running Locally (Without Docker)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Database Setup

```bash
psql -U postgres -c "CREATE DATABASE wardrobewizard;"
psql -U postgres -d wardrobewizard -f ../database/schema.sql
```

## API Endpoints

| Method | Endpoint                  | Description                   |
| ------ | ------------------------- | ----------------------------- |
| GET    | `/api/items`              | List all wardrobe items       |
| POST   | `/api/items`              | Add a new item                |
| POST   | `/api/analyze-clothing`   | AI analysis of clothing image |
| POST   | `/api/outfits/generate`   | Generate outfit combinations  |
| GET    | `/api/analytics/wardrobe` | Get wardrobe insights         |
| GET    | `/api/weather`            | Get current weather           |

## Tech Stack

| Layer    | Technology                                     |
| -------- | ---------------------------------------------- |
| Frontend | HTML5, CSS3, Vanilla JS, Bootstrap 5, Chart.js |
| Backend  | Python, Flask, Flask-CORS                      |
| Database | PostgreSQL                                     |
| ML       | PyTorch (ResNet18), scikit-learn (K-Means)     |
| Infra    | Docker, Nginx, OpenWeather API                 |
