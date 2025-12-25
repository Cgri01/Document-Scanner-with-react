const tesseract = require('tesseract.js');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const natural = require('natural');
const nlp = require('compromise');


//express uygulaması olusturma:
const app = express();
const PORT = 5000;

//Güvenlik ve dosya işlemleri için middleware'ler:
app.use(cors()); //React uygulmasının backende erişimine izin vermek
app.use(express.json());
app.use("/uploads" , express.static("uploads")) //yüklenen dosyaları paylaşmka

//Multer yapılandırması (dosya yükleme için):
const storage = multer.diskStorage({
    destination : (req , file , cb) => {
        //Yüklenen dosyaların kaydedileceği klasör:
        const uploadDir = "uploads";
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null , uploadDir);
    },
    filename: (req , file , cb) => {
        //Dosya ismini benzersiz yapıyoruz:
        const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1E9) + "-" + file.originalname;
        cb(null , uniqueName);
    }
    
});

const upload = multer({
    storage: storage,
    fileFilter: (req , file , cb) => {
        //Sadece resim dosyalarına izin veriyoruz:
        if (file.mimetype.startsWith("image/")) {
            cb(null , true);
        } else {
            cb(new Error("Only image files are allowed!!!") , false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 //5MB sınırı
    }
});

//Test endpointi çalısıyor mu kontrolü için:
app.get("/api/test" , (req , res) => {
    res.json({ message: "API is working!!!"})
});

//Görüntü işleme fonksiyonu:
const {createCanvas , loadImage} = require("canvas");
const { text } = require('stream/consumers');
const { error } = require('console');
const e = require('express');


//Kenar tespit fonksiyonu:
async function detectEdges(imagePath) {
    try {
        const image = sharp(imagePath);

        //Resmi gri tona çevirme ve kenar tespiti uygulama:
        const edgesBuffer = await image
        .grayscale() //Gri tona çevirme
        .normalise() //Kontrast artırma
        .convolve({
            width: 3,
            height: 3,
            kernel : [-1 , -1 , -1 ,-1 , 8 , -1 , -1 , -1 , -1]
        })
        .toBuffer();

        //Kenar tespit edilmiş sonucu kaydediyoruz:
        const edgesFilename = `edges-${Date.now()}.jpg`;
        const edgesPath = path.join("uploads" , edgesFilename);

        await sharp(edgesBuffer).jpeg({ quality : 80}).toFile(edgesPath);

        return {
            detected: true,
            edgesPath: edgesPath,
            edgesUrl: `/uploads/${edgesFilename}`
        };

    } catch (error) {
        console.error("Edge detection error:" , error);
        return {
            detected: false,
            edgesPath: null,
            edgesUrl: null
        }
    }
}

//OCR fonksiyonu:
async function extractTextFromImage(imagePath) {
    try {
        console.log("Starting OCR for image:" , imagePath);

        //Görüntü optimizasyonu:
        const processedImageBuffer = await sharp(imagePath)
            .grayscale()
            .normalise()
            .sharpen({sigma: 1})
            .toBuffer();

        const { data } = await tesseract.recognize(
            processedImageBuffer,
            "eng+tur", {
                logger: m => {
                    if (m.status === "recognizing text") {
                        console.log(`OCR Progress: %${Math.round(m.progress * 100)}`);
                    }
                }
            }
        );


        console.log("OCR completed. Trust score:" , data.confidence);
        console.log("Text Length: " , data.text.length);

        //Metni temizleme:
        const cleanedText = data.text
            .replace(/\n\s*\n/g, '\n') // Fazla boş satırları temizle
            .replace(/[^\S\n]+/g, ' ') // Fazla boşlukları temizle
            .trim();

        const languageDetected = detectLanguge(cleanedText);

        //Metin var mı kontrolü:
        const hasRealText = cleanedText.replace(/[\s\W_]+/g, '').length > 3; 

        return {
            success: true,
            rawText: data.text,
            text: cleanedText,
            confidence: Math.round(data.confidence),
            language: languageDetected,
            textLength : cleanedText.length,
            hasText: hasRealText
        };

    } catch (error) {
        console.error("OCR error:" , error);

        //Hata durumunda fallback:
        try{
            console.log("Trying fallback OCR for image:" , imagePath);
            const { data } = await tesseract.recognize(imagePath , "eng" );
            const cleanedText = data.text.trim();
            const hasRealText = cleanedText.replace(/[\s\W_]+/g, '').length > 3;
            const languageDetected = detectLanguge(cleanedText);

             return {
                success: true,
                text: cleanedText,
                confidence: Math.round(data.confidence),
                language: languageDetected,
                textLength : cleanedText.length,
                hasText: hasRealText
            };
        } catch (fallbackError) {
            console.error("Fallback OCR error:" , fallbackError);
            return {
                success: false,
                text: "",
                confidence: 0,
                error: "OCR failed " + fallbackError.message,
                hasText: false
            };
        }
        
        
    }


           
    
}

//Dil tespit fonksiyonu:
function detectLanguge(text) {
    if (!text || text.length < 10) return 'unknown';
    
    // Türkçe karakter regex'leri
    const turkishPatterns = [
        /[çğıöşüÇĞİÖŞÜ]/g,
        /\b(ve|bir|bu|ile|için|olarak|ama|çok|ben|sen|o|biz|siz|onlar)\b/gi,
        /\b(bu|şu|o|benim|senin|onun|bizim|sizin|onların)\b/gi
    ];
    
    // İngilizce karakter regex'leri
    const englishPatterns = [
        /\b(the|and|is|in|to|of|that|it|you|he|for|with|but|on|at|she|her|him|his|are|or)\b/gi,
        /\b(this|that|these|those|my|your|his|her|our|their)\b/gi
    ];
    
    let turkishScore = 0;
    let englishScore = 0;
    
    // Türkçe puanını hesapla
    turkishPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) turkishScore += matches.length;
    });
    
    // İngilizce puanını hesapla
    englishPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) englishScore += matches.length;
    });
    
    // Özel Türkçe kelime kontrolü
    const specialTurkishWords = ['ğ', 'ü', 'ş', 'ı', 'ö', 'ç', 'Ğ', 'Ü', 'Ş', 'İ', 'Ö', 'Ç'];
    specialTurkishWords.forEach(char => {
        if (text.includes(char)) turkishScore += 5;
    });
    
    // Karar verme
    if (turkishScore > englishScore * 1.5) return 'turkish';
    if (englishScore > turkishScore * 1.5) return 'english';
    if (turkishScore > 0 && englishScore > 0) return 'mixed';
    
    return 'unknown';
}


//Basit görüntü analizi:
async function analyzeImage(imagePath) {

    try {
        //Sharp kutuphanesi ile resmi yüklüyoruz:
        const image = await sharp(imagePath);
        const metadata = await image.metadata();
        
        //Resim istatistikleri:
        const stats = await image.stats();

        //Parlaklık analizi:
        const brightness = stats.channels[0].mean; //kırmızı kanal ortalaması

        //Kontrast analizi:
        const contrast = Math.sqrt(
            stats.channels[0].stdev * stats.channels[0].stdev +
            stats.channels[1].stdev * stats.channels[1].stdev +
            stats.channels[2].stdev * stats.channels[2].stdev
        ) / 3;

        //Kenar tespiti:
        const edgeDetection = await detectEdges(imagePath);

        //kalite puanı hesaplama(basit)
        let qualityScore = 50; //Temel puan

        
        // Çözünürlük puanı
        const megapixels = (metadata.width * metadata.height) / 1000000;
        if (megapixels > 5) qualityScore += 20;
        else if (megapixels > 2) qualityScore += 10;
        
        // Parlaklık puanı
        if (brightness > 100 && brightness < 200) qualityScore += 15;
        else if (brightness > 50 && brightness < 250) qualityScore += 5;
        
        // Kontrast puanı
        if (contrast > 40) qualityScore += 15; 

        const suggestions = [];
        if (brightness < 100) suggestions.push("The photo seems dark, take a photo from brighter place!");
        if (brightness > 200) suggestions.push("The photo is so bright!");

        if (contrast < 30) suggestions.push("Contrast is low , use more clear background!");
        if(megapixels < 2) suggestions.push("Resolution is low, hold the camera closer.");
        
        return{
            dimensions : {
                width : metadata.width,
                height : metadata.height,
                megapixels : parseFloat(megapixels.toFixed(2))

            },
            quality : {
                score: Math.min(100 , Math.round(qualityScore)),
                brightness: Math.round(brightness),
                contrast: Math.round(contrast)
            },
            suggestions: suggestions,
            detected: qualityScore > 60, //ilerde burada metin tespiti olacak
            edgeDetection: edgeDetection
        };

    } catch (error) {
        console.error("Image analysis error:" , error);
        return{
            dimensions: { width: 0 , height: 0 , megapixels: 0},
            quality: { score: 0, brightness: 0 , contrast: 0},
            suggestions: ["Image can not analysis"],
            detected: false,
            edgeDetection: { detected: false , edgesPath: null , edgesUrl: null}
        };
    }
        
    
}

//Metin Temizleme ve iyileştirme fonksiyonu:
function enhanceOCRText(text) {
    if (!text || text.trim().length === 0) {
        return {
            original: text,
            enhanced: text,
            improvements: [],
            confidence: 0,
            detectedLanguage: 'unknown',
            wordCount: 0,
            characterCount: 0
        };
    }

    const originalText = text;
    let enhancedText = text;
    const improvements = [];
    
    // İstatistikler
    const wordCount = enhancedText.split(/\s+/).filter(word => word.length > 0).length;
    const characterCount = enhancedText.replace(/\s+/g, '').length;
    
    // Dil tespiti (gelişmiş)
    const detectedLanguage = detectLanguge(enhancedText);

    // 1. GEREKSİZ BOŞLUKLARI TEMİZLEME
    const beforeSpacing = enhancedText;
    enhancedText = enhancedText
        .replace(/[ \t]+/g, ' ') // Çoklu boşlukları tek boşluğa çevir
        .replace(/\s+\./g, '.')  // Noktadan önceki boşlukları kaldır
        .replace(/\s+,/g, ',')   // Virgülden önceki boşlukları kaldır
        .replace(/\.\s*,/g, ',') // "nokta virgül" hatasını düzelt
        .replace(/\n\s*\n\s*\n+/g, '\n\n') // Çoklu boş satırları iki satıra indir
        .replace(/^\s+|\s+$/gm, '') // Her satırın başındaki ve sonundaki boşlukları temizle
        .trim();

    if (beforeSpacing !== enhancedText) {
        improvements.push("Extra spaces and line breaks cleaned");
    }

    // 2. HARF-RAKAM KARIŞIKLIĞI DÜZELTME (GENİŞLETİLMİŞ)
    const beforeCharFix = enhancedText;
    
    // Rakam-harf karışıklığı düzeltmeleri
    const charReplacements = {
        '0': ['o', 'O'],
        '1': ['l', 'I', 'i'],
        '2': ['z', 'Z'],
        '3': ['e', 'E'],
        '5': ['s', 'S'],
        '6': ['b', 'B'],
        '8': ['B'],
        '9': ['g', 'q']
    };
    
    // Türkçe karakter düzeltmeleri
    enhancedText = enhancedText
        .replace(/ı/g, 'i') // Küçük ı -> i (OCR hatası)
        .replace(/İ/g, 'I') // Büyük İ -> I
        .replace(/ş/g, 's') // ş -> s (İngilizce OCR'da)
        .replace(/Ş/g, 'S')
        .replace(/ç/g, 'c')
        .replace(/Ç/g, 'C')
        .replace(/ğ/g, 'g')
        .replace(/Ğ/g, 'G')
        .replace(/ö/g, 'o')
        .replace(/Ö/g, 'O')
        .replace(/ü/g, 'u')
        .replace(/Ü/g, 'U');
    
    // Kelime içindeki rakamları düzelt
    enhancedText = enhancedText
        .replace(/([a-zA-Z])0([a-zA-Z])/g, '$1o$2')
        .replace(/([a-zA-Z])1([a-zA-Z])/g, '$1l$2')
        .replace(/([a-zA-Z])5([a-zA-Z])/g, '$1s$2')
        .replace(/^0/g, 'O') // Satır başındaki 0 -> O
        .replace(/\s0\s/g, ' o '); // Tek başına 0 -> o

    if (beforeCharFix !== enhancedText) {
        improvements.push("OCR character recognition errors corrected");
    }

    // 3. TARİH VE SAAT FORMATLARINI STANDARTLAŞTIRMA
    const beforeDate = enhancedText;
    
    // Tarih formatları
    enhancedText = enhancedText
        .replace(/(\d{1,2})\s*[\.\/\-]\s*(\d{1,2})\s*[\.\/\-]\s*(\d{2,4})/g, '$1/$2/$3')
        .replace(/(\d{4})\s*[\.\/\-]\s*(\d{1,2})\s*[\.\/\-]\s*(\d{1,2})/g, '$1/$2/$3')
        .replace(/(\d{1,2})\s*(Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{4})/gi, '$1 $2 $3');
    
    // Saat formatları
    enhancedText = enhancedText
        .replace(/(\d{1,2})\s*[\.\:]\s*(\d{2})\s*(am|pm|AM|PM)?/g, (match, hour, minute, period) => {
            const h = hour.padStart(2, '0');
            const m = minute.padStart(2, '0');
            return period ? `${h}:${minute} ${period.toLowerCase()}` : `${h}:${minute}`;
        });

    if (beforeDate !== enhancedText) {
        improvements.push("Date and time formats standardized");
    }

    // 4. PARA BİRİMİ VE SAYI FORMATLARI
    const beforeCurrency = enhancedText;
    
    enhancedText = enhancedText
        .replace(/(\d+)\s*(TL|USD|EUR|GBP|TRY)/gi, '$1 $2')
        .replace(/(TL|USD|EUR|GBP|TRY)\s*(\d+)/gi, '$1 $2')
        .replace(/(\d{1,3})(\d{3})/g, (match, p1, p2) => {
            // Basit binlik ayracı kontrolü (daha karmaşık regex gerekebilir)
            return match.length > 3 ? match : `${p1},${p2}`;
        });

    if (beforeCurrency !== enhancedText) {
        improvements.push("Currency and number formats improved");
    }

    // 5. EMAIL VE URL DÜZELTMELERİ
    const beforeWeb = enhancedText;
    
    // Email düzeltmeleri
    enhancedText = enhancedText
        .replace(/([a-zA-Z0-9._%+-]+)\s*@\s*([a-zA-Z0-9.-]+)\s*\.\s*([a-zA-Z]{2,})/g, '$1@$2.$3')
        .replace(/\[at\]/g, '@')
        .replace(/\[dot\]/g, '.');
    
    // URL düzeltmeleri
    enhancedText = enhancedText
        .replace(/(https?)\s*:\s*\/\s*\/(www\.)?([^\s]+)/g, '$1://$2$3')
        .replace(/www\s*\.\s*([a-zA-Z0-9.-]+)\s*\.\s*([a-zA-Z]{2,})/g, 'www.$1.$2');

    if (beforeWeb !== enhancedText) {
        improvements.push("Email and URL formats corrected");
    }

    // 6. PARAGRAF DÜZENİ
    const beforeParagraph = enhancedText;
    
    // Paragraf sonlarını kontrol et
    const lines = enhancedText.split('\n');
    let inParagraph = false;
    const processedLines = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
        
        if (line.length === 0) {
            processedLines.push('');
            inParagraph = false;
        } else if (!line.endsWith('.') && !line.endsWith('!') && !line.endsWith('?') && 
                   !line.endsWith(':') && nextLine.length > 0 && 
                   !nextLine.match(/^[A-Z\d•\-]/) && !inParagraph) {
            // Satır devam ediyor, birleştir
            processedLines.push(line + ' ' + nextLine);
            i++; // Bir sonraki satırı atla
            inParagraph = true;
        } else {
            processedLines.push(line);
            inParagraph = false;
        }
    }
    
    enhancedText = processedLines.join('\n');

    if (beforeParagraph !== enhancedText) {
        improvements.push("Paragraph structure improved");
    }

    

    // 7. ÖZEL KELİME DÜZELTMELERİ (SÖZLÜK TABANLI)
    const beforeDict = enhancedText;
    
    // Yaygın OCR hataları sözlüğü
    const commonOCRErrors = {
        // İngilizce hatalar
        'recogmze': 'recognize',
        'mformat10n': 'information',
        'docurnent': 'document',
        'scann1ng': 'scanning',
        'techn010gy': 'technology',
        '1mportant': 'important',
        
        // Türkçe hatalar
        'b1lg1': 'bilgi',
        'belge': 'belge',
        'doküman': 'doküman',
        'fotogra': 'fotoğraf',
        'res1m': 'resim',
        'taray1c1': 'tarayıcı'
    };
    
    // Sözlük düzeltmelerini uygula
    Object.keys(commonOCRErrors).forEach(error => {
        const regex = new RegExp(`\\b${error}\\b`, 'gi');
        enhancedText = enhancedText.replace(regex, commonOCRErrors[error]);
    });

    if (beforeDict !== enhancedText) {
        improvements.push("Common OCR word errors fixed using dictionary");
    }

    // 8. TABLO VE SUTUN DÜZENLEMELERİ
    const beforeTable = enhancedText;
    
    // Dikey hizalanmış metinleri düzeltme (basit tablo düzeltmesi)
    enhancedText = enhancedText.replace(/(\S+)\s{3,}(\S+)/g, (match, p1, p2) => {
        // Eğer çok fazla boşluk varsa, tablo hücresi olabilir
        return match.length > 20 ? `${p1}\t${p2}` : match;
    });

    if (beforeTable !== enhancedText) {
        improvements.push("Table-like structures detected and formatted");
    }

    // 9. KISALTMA VE AKRONİM DÜZENLEMELERİ
    const beforeAcronym = enhancedText;
    
    // Kısaltmaları koru
    enhancedText = enhancedText
        .replace(/\b([A-Z])\.\s*([A-Z])\.\s*([A-Z])\./g, '$1.$2.$3.') // U.S.A. -> U.S.A.
        .replace(/\b([A-Z]{2,})\b\./g, '$1') // USA. -> USA
        .replace(/\b([a-z])\.\s*([a-z])\./g, '$1.$2.'); // e.g. -> e.g.

    if (beforeAcronym !== enhancedText) {
        improvements.push("Abbreviations and acronyms standardized");
    }

    // 10. ÖZEL KARAKTER DÜZENLEMELERİ
    const beforeSpecial = enhancedText;
    
    enhancedText = enhancedText
        .replace(/[”“]/g, '"') // Akıllı tırnakları standart tırnağa çevir
        .replace(/[‘’]/g, "'") // Akıllı tek tırnakları standart tek tırnağa çevir
        .replace(/[—–]/g, '-') // Uzun tireleri kısa tireye çevir
        .replace(/…/g, '...')   // Üç nokta karakterini standartlaştır
        .replace(/[«»]/g, '"')  // Açılı tırnakları standart tırnağa çevir
        .replace(/[•·]/g, '•'); // Madde işaretlerini standartlaştır

    if (beforeSpecial !== enhancedText) {
        improvements.push("Special characters standardized");
    }

    // 11. CÜMLE DÜZENLEMELERİ
    const beforeSentence = enhancedText;
    
    // Cümle başı büyük harf
    enhancedText = enhancedText.replace(
        /(^\s*|[.!?]\s+)([a-z])/g,
        (m, p1, p2) => p1 + p2.toUpperCase()
    );
    

    
    // Madde işaretlerini standartlaştırma
    enhancedText = enhancedText
        .replace(/^([•\-*\u2022])\s*/gm, '• ')
        .replace(/^(\d+)[\.\)]\s*/gm, '$1. ')
        .replace(/^[a-z][\.\)]\s*/gim, (match) => match.toUpperCase());

    if (beforeSentence !== enhancedText) {
        improvements.push("Sentence structure and capitalization improved");
    }


    // 12. DİL BAZLI ÖZEL DÜZENLEMELER
    if (detectedLanguage === 'turkish') {
        const beforeTurkish = enhancedText;
        
        // Türkçe özel düzeltmeler
        enhancedText = enhancedText
            .replace(/\bve\s+ve\b/gi, 've') // Yinelenen "ve" ler
            .replace(/ı/g, 'i') // Tekrar kontrol (bazı OCR'lar ı'yı i olarak tanır)
            .replace(/(\w)\.(\w)/g, '$1. $2'); // Türkçe nokta sonrası boşluk
        
        if (beforeTurkish !== enhancedText) {
            improvements.push("Turkish language specific corrections applied");
        }
    }

    // GÜVEN PUANI HESAPLAMA
    let confidence = 60; // Temel puan
    
    // İyileştirme sayısına göre puan ekle
    confidence += Math.min(improvements.length * 5, 30);
    
    // Metin uzunluğuna göre puan ekle
    if (characterCount > 100) confidence += 5;
    if (characterCount > 500) confidence += 5;
    
    // Kelime başına karakter sayısına göre puan (çok düşük veya çok yüksekse kötü)
    const avgCharsPerWord = characterCount / Math.max(wordCount, 1);
    if (avgCharsPerWord > 3 && avgCharsPerWord < 10) confidence += 5;
    
    confidence = Math.min(95, confidence); // Maksimum %95

    // SONUÇ DÖNÜŞÜ
    return {
        original: originalText,
        enhanced: enhancedText,
        improvements: improvements,
        confidence: Math.round(confidence),
        detectedLanguage: detectedLanguage,
        wordCount: wordCount,
        characterCount: characterCount,
        avgCharsPerWord: parseFloat(avgCharsPerWord.toFixed(2)),
        improvementCount: improvements.length,
        stats: {
            originalLength: originalText.length,
            enhancedLength: enhancedText.length,
            reductionPercentage: originalText.length > 0 ? 
                Math.round(((originalText.length - enhancedText.length) / originalText.length) * 100) : 0
        }
    };
}


//PDF oluşturma fonksiyonu:
async function createPDF(text , title = "OCR Results"){
    return new Promise((resolve , reject) => {
        try {
            const doc = new PDFDocument();
            const pdfFilename = `text-${Date.now()}.pdf`;
            const pdfPath = path.join("uploads" , pdfFilename);

            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);

            //Başlık ekleme:
            doc.fontSize(18).font("Helvetica-Bold").fillColor("#2c3e50").text(title , 50 , 50 , {align: "center"});
            doc.moveDown();

            //Metin ekleme:
            doc.fontSize(11).font("Helvetica").fillColor("#34495e").text(text , {
                align: "left",
                width: 500,
                lineGap: 4,
                paragraphGap: 10
            });
            doc.end();

            stream.on("finish" , () => {
                resolve({
                    success: true,
                    pdfPath: pdfPath,
                    pdfUrl: `/uploads/${pdfFilename}`,
                    filename: pdfFilename
                });
            });

            stream.on("error" , reject);
        }
        catch (error) {
            reject(error);
        }
    });
}

//PDF Oluşturma endpointi:
app.post("/api/generate-pdf" , upload.single("document") , async (req , res) => {
    try {
        if (!req.body.ocrText){
            return res.status(400).json({ error: "Ocr text is required to generate PDF!!!"})
        }

        const { ocrText , title = "Scanned Document" , includeAnalysis = "false" } = req.body;

        console.log("Generating PDF for text length:" , ocrText.length);

        const pdfResult = await createPDF(ocrText , title);

        res.json({
            success: true,
            message: "PDF generated successfully!!!",
            pdf: pdfResult
        });
    } catch (error) {
        console.error("Error during PDF generation:" , error);
        res.status(500).json({
            error: "Pdf could not created!!!",
            details: error.message
        });
    }
});

//Metin Iyileştirme Endpointi:
app.post("/api/enhance-text", (req, res) => {
  const { text } = req.body;

  if (!text || text.trim().length === 0) {
    return res.status(400).json({ error: "Text is required" });
  }

  const result = enhanceOCRText(text);

  res.json({
    success: true,
    enhancement: result
  });
});



//Resim yükleme endpointi:
app.post("/api/upload" , upload.single("document") , async(req , res) => {
    try{
        if (!req.file) {
            return res.status(400).json({ error: "File is not uploaded!!!"})
        }

        //Yüklenen dosya bilgileri:
        const uploadedFile = req.file;
        console.log("File received:" , uploadedFile.originalname);

      //   // Burada ileride görüntü işleme yapacağız
      //  // Şimdilik sadece dosya bilgilerini döndürüyoruz
    
      //Goruntu Analizi:
      console.log("Starting image analysis for:" , uploadedFile.path);
      const analysis = await analyzeImage(uploadedFile.path);

      //OCR işlemi:
      console.log("Starting OCR for:" , uploadedFile.path);
      const ocrResult = await extractTextFromImage(uploadedFile.path);
      console.log("OCR Completed");

      //Metin Iyileştirme:
      let enhancementResult = null;
      if (ocrResult.success && ocrResult.hasText) {
        try {
            console.log("Enhancing OCR text...");
            enhancementResult = enhanceOCRText(ocrResult.text);
            console.log("Text enhancement completed.");

            
        } catch (enhanceError) {
            console.log("Text enhancement skipped: " , enhanceError.message);
        }
      }

      //PDF Oluşturma:
      let pdfResult = null;
      if (ocrResult.success && ocrResult.hasText) {
        try {
            const textForPDF = enhancementResult ? enhancementResult.enhanced : ocrResult.text;
            pdfResult = await createPDF(textForPDF , `Scanned Document - ${uploadedFile.originalname}`);
            console.log("PDF automatically created");

        } catch (pdfError) {
            console.error("Automatic PDF creation error:" , pdfError);
        }
      } 

    //   //Iyileştirme Sonucları:
    //     if (enhancementResult) {
    //         response.enhancement = enhancementResult;
    //     }

    //     //PDF Bilgileri:
    //     if (pdfResult) {
    //         response.pdf = pdfResult;
    //     }


        res.json({
            success: true,
            message: "The file uploaded successfully!!!",
            file: {
                filename: uploadedFile.filename,
                originalname: uploadedFile.originalname,
                path: uploadedFile.path,
                size: uploadedFile.size,
                url: `/uploads/${uploadedFile.filename}`
            },
            analysis: analysis, //Analiz sonuçlarını da gönderiyoruz
            ocr: ocrResult
        });
        
        
    }catch (error) {
        console.error("Error during file upload: " , error);
        res.status(500).json({ 
            error: "Internal server error during file upload!!!",
            details: error.message
         });
        }

    }
);

//Sunucuyu başlatma:
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
})
    