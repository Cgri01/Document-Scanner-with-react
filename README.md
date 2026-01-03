📄 Document Scanner Application - Complete Project README
🌟 Overview
A comprehensive document scanning application with OCR (Optical Character Recognition) capabilities, image analysis, and PDF export functionality. The application consists of a React frontend and Node.js/Express backend that work together seamlessly.

🎯 Key Features
Document Scanning: Upload images or capture using camera

OCR Processing: Extract text from images in English and Turkish

Image Analysis: Quality assessment, edge detection, brightness/contrast analysis

Text Enhancement: Automatic correction of common OCR errors

PDF Generation: Convert scanned documents to downloadable PDFs

Real-time Camera: Mobile-friendly document capture interface

Multi-language Support: Turkish and English text recognition

🏗️ Project Structure
text
DOCUMENT-SCANNER/
├── backend/                 # Node.js/Express server
│   ├── server.js           # Main server file
│   ├── package.json        # Backend dependencies
│   ├── uploads/            # File storage directory
│   │   ├── eng.traineddata # English OCR model
│   │   └── tur.traineddata # Turkish OCR model
│   └── node_modules/       # Backend dependencies
│
└── frontend/               # React application
    ├── src/
    │   ├── components/     # React components
    │   │   ├── Camera.js   # Camera component
    │   │   └── Camera.css  # Camera styles
    │   ├── App.js          # Main application component
    │   ├── App.css         # Main styles
    │   └── index.js        # Entry point
    ├── package.json        # Frontend dependencies
    └── public/             # Static files
⚙️ Prerequisites
Node.js (v14 or higher)

npm or yarn

Modern web browser with camera access (for camera features)

🚀 Quick Installation Guide
1. Clone and Setup
bash
# Clone the project
git clone <repository-url>
cd DOCUMENT-SCANNER

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
2. Configure Environment Variables
Backend (.env file in backend/)
env
PORT=5000
NODE_ENV=development
MAX_FILE_SIZE=5242880
CORS_ORIGIN=http://localhost:3000
Frontend (.env file in frontend/)
env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_NAME=Document Scanner

wget https://github.com/tesseract-ocr/tessdata/raw/main/tur.traineddata
3. Install Additional Dependencies
bash
# In backend directory
cd backend
npm install canvas@2.11.2
🖥️ Running the Application
Option A: Run Separately (Recommended for Development)
1. Start Backend Server
bash
# Open terminal 1
cd backend
npm start
# Server runs at http://localhost:5000
2. Start Frontend Application
bash
# Open terminal 2
cd frontend
npm start
# Application runs at http://localhost:3000
Option B: Run with Concurrently (Single Command)
bash
# Install concurrently globally
npm install -g concurrently

# From project root directory
concurrently "cd backend && npm start" "cd frontend && npm start"
🔧 API Documentation
Backend Endpoints
Endpoint	Method	Description	Request Body
GET /api/test	GET	API health check	None
POST /api/upload	POST	Upload and process image	FormData with document file
POST /api/enhance-text	POST	Enhance OCR text	{ "text": "string" }
POST /api/generate-pdf	POST	Generate PDF from text	{ "ocrText": "string", "title": "string" }
Example API Requests
Upload Image
bash
curl -X POST http://localhost:5000/api/upload \
  -F "document=@/path/to/document.jpg"
Enhance Text
bash
curl -X POST http://localhost:5000/api/enhance-text \
  -H "Content-Type: application/json" \
  -d '{"text": "Sample OCR text with errors"}'
📱 Frontend Features
1. File Upload
Drag & drop or file selector

Support for JPG, PNG, JPEG formats

Maximum file size: 5MB

Real-time preview

2. Camera Integration
Real-time document capture

Alignment guides and grids

Flash simulation

Mobile-optimized interface

3. Document Analysis
Image quality scoring

Brightness and contrast analysis

Edge detection visualization

Improvement suggestions

4. OCR Results
Extracted text display

Confidence percentage

Language detection (Turkish/English)

Text enhancement options

5. Export Options
Download as PDF

Copy text to clipboard

Share results

🛠️ Development
Backend Development
bash
# Development mode with auto-restart
cd backend
npm run dev

# Debug mode
DEBUG=app:* npm start
Frontend Development
bash
cd frontend
# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
🧪 Testing
Backend Tests
bash
# Test API endpoints
curl http://localhost:5000/api/test

# Test file upload
curl -X POST http://localhost:5000/api/upload \
  -F "document=@./test/test-image.jpg"
Frontend Tests
Open browser at http://localhost:3000

Test file upload functionality

Test camera capture

Verify OCR processing

🔒 Security Considerations
1. File Upload Security
File type validation (images only)

File size limitation (5MB)

Unique filename generation

Malware scanning (recommended for production)

2. CORS Configuration
Backend configured to accept requests only from frontend origin

Production: Update CORS origin to your domain

3. Environment Variables
Never commit .env files

Use different keys for development and production

Validate all environment variables on startup

📊 Performance Optimization
Backend
Image processing with Sharp library

Async OCR processing

File cleanup routines

Connection pooling

Frontend
Lazy loading of components

Image compression before upload

Debounced API calls

Progressive enhancement

🐛 Troubleshooting Guide
Common Issues
1. OCR Not Working
Symptoms: No text extracted from images
Solutions:

Verify language model files exist in backend/uploads/

Check image quality (try with clearer images)

Ensure Tesseract.js is properly installed

2. Camera Access Denied
Symptoms: Camera doesn't start
Solutions:

Check browser permissions

Ensure HTTPS in production (camera requires secure context)

Try different browser

3. API Connection Failed
Symptoms: Frontend cannot connect to backend
Solutions:

Verify backend is running on port 5000

Check CORS configuration

Ensure no firewall blocking localhost connections

4. Canvas Module Error (Backend)
Symptoms: Cannot find module 'canvas'
Solutions:

bash
cd backend
npm rebuild canvas --update-binary
# or
npm install canvas@2.11.2
📈 Deployment
Backend Deployment (Example: Heroku)
bash
# From backend directory
heroku create your-app-name
git push heroku main

# Set environment variables on Heroku
heroku config:set NODE_ENV=production
heroku config:set CORS_ORIGIN=https://your-frontend.com
Frontend Deployment (Example: Netlify/Vercel)
bash
# Build the application
cd frontend
npm run build

# Deploy build folder to your hosting service
Required Environment Variables for Production
env
# Backend
NODE_ENV=production
PORT=your_port
CORS_ORIGIN=https://your-domain.com
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Frontend
REACT_APP_API_URL=https://your-backend-api.com
📚 Dependencies
Backend
express: Web server framework

tesseract.js: OCR engine

sharp: Image processing

multer: File upload handling

pdfkit: PDF generation

cors: Cross-origin resource sharing

canvas: Image manipulation (for edge detection)

Frontend
react: UI library

axios: HTTP client

react-dom: React DOM bindings

web-vitals: Performance monitoring

🤝 Contributing
Fork the repository

Create a feature branch (git checkout -b feature/AmazingFeature)

Commit changes (git commit -m 'Add AmazingFeature')

Push to branch (git push origin feature/AmazingFeature)

Open a Pull Request

Code Style
Backend: Standard JavaScript style

Frontend: React functional components with hooks

Use meaningful variable names

Add comments for complex logic

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

📞 Support
For support, email: [your-email@example.com] or create an issue in the repository.

🎓 Learning Resources
Tesseract.js Documentation

React Documentation

Express.js Guide

Sharp Image Processing

✨ Acknowledgments
Tesseract OCR team for the OCR engine

Sharp library maintainers for image processing

React team for the frontend library

All contributors and testers

Happy Document Scanning! 📄✨
