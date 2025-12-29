import React, {useState , useRef} from "react";
import axios from "axios";
import "./App.css";
import Camera from "./components/Camera";

function App() {

  const [selectedFile , setSelectedFile] = useState(null);
  const [previewUrl , setPreviewUrl] = useState(null);
  const [uploadResult , setUploadResult] = useState(null);
  const [isLoading , setIsLoading] = useState(false);
  const [showCamera , setShowCamera] = useState(false);
  const [pdfInfo , setPdfInfo] = useState(null);
  const [isGeneratingPDF , setIsGeneratingPDF] = useState(false);
  const [showEnhancedText, setShowEnhancedText] = useState(false);
  const [isEnhancing , setIsEnhancing] = useState(false);

  const fileInputRef = useRef();

  // Handle file selection (dosya seçildiğinde çalışacak fonksiyon:)

  const handleFileSelect = (event) => {

    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);

      // Dosya önizlemesi için URL olşulturma:
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result);
      };
      fileReader.readAsDataURL(file);


    }
  };

  const handleCameraCapture = (file , previewData) => {
    setSelectedFile(file);
    setPreviewUrl(previewData);
    setUploadResult(null);
    setShowCamera(false); //Kamerayı kapat
  }

  //Dosya yükleme butonına tıklanınca çalışacak fonksiyon:
  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file first.");
      return;
    }

    setIsLoading(true);
    setUploadResult(null);

    //Backende dosya göndermek için formData kullanma:
    const formData = new FormData();
    formData.append("document" , selectedFile);

    try {

      console.log("Uploading file...", selectedFile.name);

      //Axios ile backend APIsine POST isteği gönderme:
      const response = await axios.post("http://localhost:5000/api/upload" , formData , {
        headers: {
          "Content-Type" : "multipart/form-data"
        },
      });
      

      setUploadResult(response.data);
      console.log("Upload successful:", response.data);

    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadResult({
        success: false,
        error: "Error uploading file" + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Dosya seçme butonuna tıklanınca çalışacak fonksiyon:
  const handleSelectClick = () => {
    fileInputRef.current.click();
  };

  //Kamera Açma butonu:
  const handleCameraClick = () => {
    setShowCamera(true);
  };

  //Metin Iyileştirme Fonksiyonu:
  const enhanceText = async () => {
  if (!uploadResult || !uploadResult.ocr || !uploadResult.ocr.text) {
    alert("Please upload a file and complete OCR first");
    return;
  }

  setIsEnhancing(true);

  try {
    const response = await axios.post("http://localhost:5000/api/enhance-text", {
      text: uploadResult.ocr.text
    });

    const enhancement = response.data.enhancement;

    // Eğer metin zaten temizse kullanıcıya dürüst ol
    if (!enhancement || enhancement.enhanced === uploadResult.ocr.text) {
      alert("Text is already clean. No improvement needed.");
      setIsEnhancing(false);
      return;
    }

    // State'e kaydet
    setUploadResult(prev => ({
      ...prev,
      enhancement
    }));

    setShowEnhancedText(true);

  } catch (error) {
    console.error("Text enhancement error:", error);
    alert("Text enhancement failed: " + error.message);
  } finally {
    setIsEnhancing(false);
  }
};


  //Orijinal ve iyileştirilmiş metin arası geçiş. 
  const toggleTextVersion = () => {
  setShowEnhancedText(!showEnhancedText);
  };

  // PDF Oluşturma fonksiyonu:
  const generatePDF = async (type = 'simple') => {
    if (!uploadResult || !uploadResult.ocr || !uploadResult.ocr.text) {
      alert('Please upload a file and complete OCR process first.');
      return;
    }

    setIsGeneratingPDF(true);
    
    try {
      let response;
      
      if (type === 'simple') {
        // Simple PDF
        response = await axios.post('http://localhost:5000/api/generate-pdf', {
          ocrText: uploadResult.ocr.text,
          title: `Scanned: ${uploadResult.file.originalname}`
        });
      }
      

      setPdfInfo(response.data.pdf);
      console.log('PDF created:', response.data.pdf);
      
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('PDF creation error: ' + error.message);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // PDF download function
  const downloadPDF = () => {
    if (pdfInfo && pdfInfo.pdfUrl) {
      window.open(`http://localhost:5000${pdfInfo.pdfUrl}`, '_blank');
    }
  };


  // src/App.js - SADECE RETURN KISMI MODERN

  return (
    <div className="App">
      {/* Modern Header */}
      <header className="app-header">
        <div className="container">
          <div className="header-content">
            <h1 className="header-title">
              <span className="header-icon">📄</span>
              Document Scanner Pro
            </h1>
            <p className="header-subtitle">
              Upload, scan, and enhance documents Document Scanner Pro
            </p>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="container">
          
          {/* Upload Section - Modern Card Design */}
          <section className="card upload-card animate-fadeIn">
            <div className="card-header">
              <h2 className="card-title">
                <span className="card-icon">📤</span>
                Upload Document
              </h2>
              <p className="card-subtitle">
                Choose a file or capture using camera
              </p>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*,.pdf"
              className="hidden-input"
            />

            {/* Action Buttons */}
            <div className="action-buttons">
              <button 
                className="btn btn-primary btn-lg btn-with-icon"
                onClick={handleSelectClick}
              >
                <span className="btn-icon">📁</span>
                Choose File
              </button>
              
              <button 
                className="btn btn-outline-primary btn-lg btn-with-icon"
                onClick={handleCameraClick}
              >
                <span className="btn-icon">📸</span>
                Open Camera
              </button>
            </div>

            {/* Selected File Info */}
            {selectedFile && (
              <div className="file-info-card">
                <div className="file-info-header">
                  <div className="file-icon">📄</div>
                  <div className="file-details">
                    <h4 className="file-name">{selectedFile.name}</h4>
                    <p className="file-meta">
                      Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button 
                    className="btn btn-icon btn-sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    aria-label="Remove file"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Preview Section */}
          {previewUrl && (
            <section className="card preview-card animate-fadeIn">
              <h2 className="section-title">
                <span className="section-icon">👁️</span>
                Document Preview
              </h2>
              
              <div className="preview-container">
                <div className="image-wrapper">
                  <img
                    src={previewUrl}
                    alt="Document preview"
                    className="preview-image"
                  />
                </div>
              </div>
              
              <div className="preview-actions">
                <button
                  className={`btn btn-success btn-lg btn-full ${isLoading ? 'loading' : ''}`}
                  onClick={handleUpload}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="btn-icon">🚀</span>
                      Upload & Scan Document
                    </>
                  )}
                </button>
              </div>
            </section>
          )}

          {/* Results Section */}
          {uploadResult && (
            <section className="card results-card animate-fadeIn">
              {/* Success/Error Header */}
              <div className={`result-header ${uploadResult.success ? 'success' : 'error'}`}>
                {uploadResult.success ? (
                  <>
                    <span className="result-icon">✅</span>
                    <h2 className="result-title">Document Analysis Complete</h2>
                    <p className="result-subtitle">
                      Your document has been successfully processed
                    </p>
                  </>
                ) : (
                  <>
                    <span className="result-icon">❌</span>
                    <h2 className="result-title">Upload Failed</h2>
                    <p className="result-subtitle">{uploadResult.error}</p>
                  </>
                )}
              </div>

              {/* Only show detailed results if successful */}
              {uploadResult.success && (
                <>
                  {/* File Info Summary */}
                  <div className="file-summary-grid">
                    <div className="summary-item">
                      <span className="summary-label">File Name</span>
                      <span className="summary-value">{uploadResult.file.originalname}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">File Size</span>
                      <span className="summary-value">
                        {(uploadResult.file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Upload Time</span>
                      <span className="summary-value">
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Analysis Results */}
                  {uploadResult.analysis && (
                    <div className="analysis-section">
                      <h3 className="section-title">
                        <span className="section-icon">📊</span>
                        Image Analysis
                      </h3>
                      
                      <div className="metrics-grid">
                        <div className="metric-card">
                          <div className="metric-header">
                            <span className="metric-icon">🖼️</span>
                            <h4 className="metric-title">Resolution</h4>
                          </div>
                          <div className="metric-value">
                            {uploadResult.analysis.dimensions.width} × {uploadResult.analysis.dimensions.height}
                          </div>
                          <div className="metric-subtext">
                            ({uploadResult.analysis.dimensions.megapixels} MP)
                          </div>
                        </div>

                        <div className="metric-card">
                          <div className="metric-header">
                            <span className="metric-icon">⭐</span>
                            <h4 className="metric-title">Quality Score</h4>
                          </div>
                          <div className={`metric-value score-${Math.floor(uploadResult.analysis.quality.score / 20)}`}>
                            {uploadResult.analysis.quality.score}
                            <span className="metric-unit">/100</span>
                          </div>
                          <div className="quality-bar">
                            <div 
                              className="quality-fill"
                              style={{ width: `${uploadResult.analysis.quality.score}%` }}
                            ></div>
                          </div>
                        </div>

                        <div className="metric-card">
                          <div className="metric-header">
                            <span className="metric-icon">☀️</span>
                            <h4 className="metric-title">Brightness</h4>
                          </div>
                          <div className="metric-value">
                            {uploadResult.analysis.quality.brightness}
                          </div>
                        </div>

                        <div className="metric-card">
                          <div className="metric-header">
                            <span className="metric-icon">🎨</span>
                            <h4 className="metric-title">Contrast</h4>
                          </div>
                          <div className="metric-value">
                            {uploadResult.analysis.quality.contrast}
                          </div>
                        </div>
                      </div>

                      {/* Detection Status */}
                      <div className={`detection-status ${uploadResult.analysis.detected ? 'detected' : 'not-detected'}`}>
                        <div className="status-icon">
                          {uploadResult.analysis.detected ? '✅' : '⚠️'}
                        </div>
                        <div className="status-content">
                          <h4>Document Detection</h4>
                          <p>
                            {uploadResult.analysis.detected 
                              ? "Document successfully detected in image"
                              : "Unable to detect document clearly"}
                          </p>
                        </div>
                      </div>

                      {/* Edge Detection */}
                      {uploadResult.analysis.edgeDetection && uploadResult.analysis.edgeDetection.detected && (
                        <div className="edge-detection-section">
                          <h4 className="section-subtitle">Edge Detection</h4>
                          <div className="edge-image-wrapper">
                            <img 
                              src={`http://localhost:5000${uploadResult.analysis.edgeDetection.edgesUrl}`}
                              alt="Edge detection result"
                              className="edge-image"
                            />
                          </div>
                        </div>
                      )}

                      {/* Suggestions */}
                      {uploadResult.analysis.suggestions.length > 0 && (
                        <div className="suggestions-box">
                          <h4 className="section-subtitle">
                            <span className="suggestion-icon">💡</span>
                            Suggestions for Improvement
                          </h4>
                          <ul className="suggestions-list">
                            {uploadResult.analysis.suggestions.map((suggestion, index) => (
                              <li key={index} className="suggestion-item">
                                <span className="check-icon">✓</span>
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {/* OCR Results */}
                  {uploadResult.ocr && (
                    <div className="ocr-section">
                      <div className="section-header">
                        <h3 className="section-title">
                          <span className="section-icon">🔤</span>
                          Text Recognition (OCR)
                        </h3>
                        <div className="ocr-stats">
                          <div className="ocr-stat">
                            <span className="stat-label">Confidence:</span>
                            <span className={`stat-value confidence-${Math.floor(uploadResult.ocr.confidence / 20)}`}>
                              {uploadResult.ocr.confidence}%
                            </span>
                          </div>
                          <div className="ocr-stat">
                            <span className="stat-label">Language:</span>
                            <span className="stat-value">
                              {uploadResult.ocr.language || "English"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Extracted Text */}
                      <div className="extracted-text-section">
                        <div className="text-header">
                          <h4 className="text-title">Extracted Text</h4>
                          <div className="text-actions">
                            {uploadResult.ocr.success && uploadResult.ocr.hasText && (
                              <>
                                <button
                                  className={`btn btn-sm ${uploadResult.enhancement ? 'btn-success' : 'btn-primary'}`}
                                  onClick={enhanceText}
                                  disabled={isEnhancing || uploadResult.enhancement}
                                >
                                  {isEnhancing ? (
                                    <>
                                      <span className="spinner-sm"></span>
                                      Enhancing...
                                    </>
                                  ) : uploadResult.enhancement ? (
                                    <>
                                      <span className="btn-icon">✅</span>
                                      Enhanced
                                    </>
                                  ) : (
                                    <>
                                      <span className="btn-icon">✨</span>
                                      Enhance Text
                                    </>
                                  )}
                                </button>
                                
                                {uploadResult.enhancement && (
                                  <button
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={toggleTextVersion}
                                  >
                                    {showEnhancedText ? (
                                      <>
                                        <span className="btn-icon">📄</span>
                                        Show Original
                                      </>
                                    ) : (
                                      <>
                                        <span className="btn-icon">✨</span>
                                        Show Enhanced
                                      </>
                                    )}
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-container">
                          {uploadResult.ocr.success && uploadResult.ocr.text ? (
                            <div className="text-content">
                              <pre className="recognized-text">
                                {showEnhancedText && uploadResult.enhancement 
                                  ? uploadResult.enhancement.enhanced 
                                  : uploadResult.ocr.text}
                              </pre>
                              
                              {/* Enhancement Stats */}
                              {uploadResult.enhancement && showEnhancedText && (
                                <div className="enhancement-stats">
                                  <div className="enhancement-stat">
                                    <span className="stat-label">Improvements:</span>
                                    <span className="stat-value">
                                      {uploadResult.enhancement.improvements.length}
                                    </span>
                                  </div>
                                  <div className="enhancement-stat">
                                    <span className="stat-label">Confidence:</span>
                                    <span className={`stat-value confidence-${Math.floor(uploadResult.enhancement.confidence / 20)}`}>
                                      {uploadResult.enhancement.confidence}%
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="no-text-message">
                              <span className="no-text-icon">🔍</span>
                              <p>No text detected in the image</p>
                            </div>
                          )}
                        </div>

                        {/* Improvements List */}
                        {uploadResult.enhancement && 
                        showEnhancedText && 
                        uploadResult.enhancement.improvements.length > 0 && (
                          <div className="improvements-list">
                            <h5 className="improvements-title">
                              <span className="improvements-icon">✨</span>
                              Applied Improvements
                            </h5>
                            <ul className="improvements-items">
                              {uploadResult.enhancement.improvements.map((improvement, index) => (
                                <li key={index} className="improvement-item">
                                  <span className="improvement-icon">✓</span>
                                  {improvement}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* OCR Info Note */}
                      <div className="ocr-note">
                        <span className="note-icon">ℹ️</span>
                        <p>
                          OCR accuracy depends on image quality, lighting, and font clarity.
                          For best results, ensure documents are well-lit and in focus.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* PDF Export Section */}
                  {uploadResult.ocr?.success && uploadResult.ocr.text && (
                    <div className="pdf-section">
                      <h3 className="section-title">
                        <span className="section-icon">📄</span>
                        Export as PDF
                      </h3>
                      
                      <div className="pdf-actions">
                        <button
                          className="btn btn-primary btn-with-icon"
                          onClick={() => generatePDF('simple')}
                          disabled={isGeneratingPDF}
                        >
                          {isGeneratingPDF ? (
                            <>
                              <span className="spinner-sm"></span>
                              Creating PDF...
                            </>
                          ) : (
                            <>
                              <span className="btn-icon">🖨️</span>
                              Create PDF Document
                            </>
                          )}
                        </button>
                      </div>

                      {/* PDF Info */}
                      {pdfInfo && (
                        <div className="pdf-info-card">
                          <div className="pdf-success-message">
                            <span className="success-icon">✅</span>
                            <div>
                              <h4 className="success-title">PDF Created Successfully!</h4>
                              <p className="success-subtitle">
                                Your document has been converted to PDF format
                              </p>
                            </div>
                          </div>
                          
                          <div className="pdf-actions">
                            <button 
                              className="btn btn-success btn-with-icon"
                              onClick={downloadPDF}
                            >
                              <span className="btn-icon">⬇️</span>
                              Download PDF
                            </button>
                            <span className="pdf-filename">
                              {pdfInfo.filename}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {/* Camera Component */}
          {showCamera && (
            <Camera
              onCapture={handleCameraCapture}
              onClose={() => setShowCamera(false)}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="container">
          <div className="footer-content">
            <p className="footer-text">
              Document Scanner Pro © {new Date().getFullYear()}
            </p>
            <p className="footer-subtext">
              Document Processing System
            </p>
          </div>
        </div>
      </footer>
    </div>
  );

  }

  export default App;


