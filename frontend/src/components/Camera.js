import React , {useRef , useState , useCallback, useEffect} from "react";
import "./Camera.css";

const Camera = ( {onCapture , onClose} ) => {

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    const [stream , setStream] = useState(null);
    const [isCameraOn , setIsCameraOn] = useState(false);
    const [error , setError] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);

    // Kamerayı açma fonksiyonu:
    const startCamera = useCallback(async () => {
        try{
            setError(null);
            setIsCapturing(false);

            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
                    width: {ideal : 1920},
                    height: {ideal: 1080}
                }
            });
            setStream(mediaStream);
            setIsCameraOn(true);

            if(videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }

        } catch (err) {
            console.error("Camera error: " , err);
            setError("Camera access denied. Please check your permissions and try again.");
        }
    } , [])

    // Kamerayı kapatma:
    const stopCamera = useCallback( () => {
        if ( stream ) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
            setIsCameraOn(false);
            setIsCapturing(false);
        }
    } , [stream]);

    // Foto çekme:
    const capturePhoto = useCallback( () => {
        if ( videoRef.current && canvasRef.current) {
            setIsCapturing(true);
            
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext("2d");

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            context.drawImage(video , 0 , 0, canvas.width , canvas.height);

            const photoData = canvas.toDataURL("image/jpeg" , 0.8);
            const file = dataURLtoFile(photoData , `document-${Date.now()}.jpg`);

            setTimeout(() => {
                onCapture(file , photoData);
                stopCamera();
                setIsCapturing(false);
            }, 500);

        }
    } , [onCapture , stopCamera])

    // base64 to file fonksiyonu:
    const dataURLtoFile = (dataurl , filename) => {
        const arr = dataurl.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);

        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
    
        return new File([u8arr], filename, { type: mime });
    };

    // ESC tuşu ile kapatma
    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        
        window.addEventListener('keydown', handleEscKey);
        
        return () => {
            window.removeEventListener('keydown', handleEscKey);
        };
    }, [onClose]);

    // Bileşen kapanırken kamerayı durdurma:
    useEffect( () => {
        return() => {
            stopCamera();
        };
    } , [stopCamera]);

    return (
        <div className="camera-overlay">
            
            <div className="camera-container">

                {/* Header */}
                <div className="camera-header">
                    <div className="header-content">
                        <div className="header-icon">📸</div>
                        <div>
                            <h3>Document Capture</h3>
                            <p className="header-subtitle">Position document within the frame</p>
                        </div>
                    </div>
                    <button 
                        className="close-btn" 
                        onClick={onClose}
                        aria-label="Close camera"
                    >
                        <span className="close-icon">×</span>
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="camera-error">
                        <div className="error-icon">⚠️</div>
                        <div className="error-content">
                            <h4>Camera Access Required</h4>
                            <p>{error}</p>
                        </div>
                    </div>
                )}

                {/* Video Container */}
                <div className="video-container">

                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className={`camera-video ${isCameraOn ? 'active' : 'inactive'}`}
                        style={{ transform: isCameraOn ? 'scaleX(-1)' : 'none' }}
                    />

                    {/* Grid Overlay */}
                    <div className="grid-overlay">
                        {/* Document Frame */}
                        <div className="document-frame">
                            <div className="frame-border"></div>
                        </div>
                        
                        {/* Alignment Grid */}
                        <div className="alignment-grid">
                            <div className="grid-line horizontal top"></div>
                            <div className="grid-line horizontal middle"></div>
                            <div className="grid-line horizontal bottom"></div>
                            <div className="grid-line vertical left"></div>
                            <div className="grid-line vertical middle"></div>
                            <div className="grid-line vertical right"></div>
                        </div>
                        
                        {/* Corner Markers */}
                        <div className="corner-markers">
                            <div className="corner top-left"></div>
                            <div className="corner top-right"></div>
                            <div className="corner bottom-left"></div>
                            <div className="corner bottom-right"></div>
                        </div>
                        
                        {/* Center Target */}
                        <div className="center-target">
                            <div className="target-dot"></div>
                        </div>
                    </div>

                    {/* Camera Status Overlay */}
                    {!isCameraOn && !error && (
                        <div className="camera-status">
                            <div className="status-icon">📷</div>
                            <p className="status-text">Ready to capture</p>
                        </div>
                    )}

                    {/* Capture Success Animation */}
                    {isCapturing && (
                        <div className="capture-animation">
                            <div className="flash-effect"></div>
                            <div className="capture-success">
                                <span className="success-icon">✓</span>
                                <p>Document Captured!</p>
                            </div>
                        </div>
                    )}

                    <canvas ref={canvasRef} style={{display : "none"}} />

                </div>

                {/* Camera Controls */}
                <div className="camera-controls">
                    {!isCameraOn ? (
                        <button 
                            className={`camera-btn start-btn ${isCameraOn ? 'hidden' : ''}`}
                            onClick={startCamera}
                            disabled={isCameraOn}
                        >
                            <span className="btn-icon">📷</span>
                            <span className="btn-text">Start Camera</span>
                        </button>
                    ) : (
                        <div className="controls-group">
                            <button 
                                className={`camera-btn capture-btn ${isCapturing ? 'capturing' : ''}`}
                                onClick={capturePhoto}
                                disabled={isCapturing}
                            >
                                {isCapturing ? (
                                    <>
                                        <span className="capture-spinner"></span>
                                        <span className="btn-text">Capturing...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="btn-icon">📸</span>
                                        <span className="btn-text">Capture Document</span>
                                    </>
                                )}
                            </button>
                            
                            <button 
                                className="camera-btn secondary-btn"
                                onClick={stopCamera}
                            >
                                <span className="btn-icon">⏹️</span>
                                <span className="btn-text">Stop Camera</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Tips - TAM GÖRÜNECEK ŞEKİLDE */}
                <div className="camera-tips">
                    <div className="tips-header">
                        <span className="tips-icon">💡</span>
                        <h4>Document Capture Guidelines</h4>
                    </div>
                    
                    <div className="tips-content">
                        <div className="tip-item">
                            <div className="tip-icon">☀️</div>
                            <div className="tip-text">
                                <h5>Optimal Lighting</h5>
                                <p>Use bright, even lighting without shadows for best results</p>
                            </div>
                        </div>
                        
                        <div className="tip-item">
                            <div className="tip-icon">📐</div>
                            <div className="tip-text">
                                <h5>Proper Alignment</h5>
                                <p>Align document edges with on-screen guides for accurate scan</p>
                            </div>
                        </div>
                        
                        <div className="tip-item">
                            <div className="tip-icon">🖼️</div>
                            <div className="tip-text">
                                <h5>Frame Composition</h5>
                                <p>Fill the frame completely with the document, leaving minimal border</p>
                            </div>
                        </div>
                        
                        <div className="tip-item">
                            <div className="tip-icon">👁️</div>
                            <div className="tip-text">
                                <h5>Clear Focus</h5>
                                <p>Ensure text is sharp and readable before capturing</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Camera Footer */}
                <div className="camera-footer">
                    <div className="footer-stats">
                        <div className="stat-item">
                            <span className="stat-label">Status:</span>
                            <span className={`stat-value ${isCameraOn ? 'active' : 'inactive'}`}>
                                {isCameraOn ? 'Active' : 'Ready'}
                            </span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Mode:</span>
                            <span className="stat-value">Document Scan</span>
                        </div>
                    </div>
                    <div className="footer-note">
                        <span className="note-icon">ℹ️</span>
                        <span className="note-text">Press ESC or close button to exit</span>
                    </div>
                </div>

            </div>

        </div>
    );

};

export default Camera;