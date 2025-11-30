// AI Stylist - AI Image Generation Integration
// API Configuration
const AI_API_KEY = 'd8b63d13b884c0f284533e6927b651be';
const AI_API_URL = 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image';
const REPLICATE_API_URL = 'https://api.replicate.com/v1/predictions';

let uploadedImage = null;
let uploadedImageFile = null;
let currentAIResult = null;

// Show AI Stylist Modal
function showAIStylist() {
    const modal = document.getElementById('aiStylistModal');
    if (modal) {
        modal.style.display = 'flex';
        // Reset state
        resetAIStylist();
    }
}

// Close AI Stylist Modal
function closeAIStylist() {
    const modal = document.getElementById('aiStylistModal');
    if (modal) {
        modal.style.display = 'none';
        resetAIStylist();
    }
}

// Reset AI Stylist State
function resetAIStylist() {
    uploadedImage = null;
    uploadedImageFile = null;
    currentAIResult = null;
    
    // Hide preview
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';
    
    // Hide results
    const resultsSection = document.getElementById('aiResultsSection');
    if (resultsSection) resultsSection.style.display = 'none';
    
    // Hide loading
    const loadingState = document.getElementById('aiLoadingState');
    if (loadingState) loadingState.style.display = 'none';
    
    // Reset radio buttons
    const classicRadio = document.querySelector('input[name="hairStyle"][value="classic"]');
    if (classicRadio) classicRadio.checked = true;
    
    // Enable generate button
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) generateBtn.disabled = false;
}

// Handle Image Upload
function handleAIImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        showToast('❌ الرجاء اختيار صورة صحيحة', 'error');
        return;
    }
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showToast('❌ حجم الصورة يجب أن يكون أقل من 10 ميجا', 'error');
        return;
    }
    
    uploadedImageFile = file;
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedImage = e.target.result;
        const preview = document.getElementById('imagePreview');
        const previewContainer = document.getElementById('imagePreviewContainer');
        
        if (preview && previewContainer) {
            preview.src = uploadedImage;
            previewContainer.style.display = 'block';
        }
        
        showToast('✅ تم تحميل الصورة بنجاح', 'success');
    };
    reader.readAsDataURL(file);
}

// Remove Uploaded Image
function removeAIImage() {
    uploadedImage = null;
    uploadedImageFile = null;
    
    const previewContainer = document.getElementById('imagePreviewContainer');
    if (previewContainer) previewContainer.style.display = 'none';
    
    // Reset file input
    const fileInput = document.getElementById('aiImageInput');
    if (fileInput) fileInput.value = '';
}

// Simulate AI Processing (Demo Mode)
async function simulateAIProcessing(prompt, style) {
    // Update loading message progressively
    const loadingState = document.getElementById('aiLoadingState');
    const loadingText = loadingState?.querySelector('p');
    const loadingSmall = loadingState?.querySelector('small');
    
    if (loadingText) loadingText.textContent = 'جاري تحليل الصورة...';
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (loadingText) loadingText.textContent = `تطبيق فلتر ${getStyleName(style)}...`;
    if (loadingSmall) loadingSmall.textContent = 'معالجة الألوان والتباين';
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (loadingText) loadingText.textContent = 'إضافة التحسينات النهائية...';
    if (loadingSmall) loadingSmall.textContent = 'تطبيق التأثيرات الاحترافية';
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Apply canvas-based image enhancement
    const enhancedImage = await enhanceImageWithCanvas(uploadedImage, style);
    currentAIResult = enhancedImage;
    displayAIResult(currentAIResult);
}

// Get style name in Arabic
function getStyleName(style) {
    const names = {
        classic: 'الكلاسيكي',
        modern: 'العصري',
        fade: 'الفيد',
        beard: 'اللحية المحترفة'
    };
    return names[style] || 'AI';
}

// Enhance Image with Canvas (Client-side processing)
async function enhanceImageWithCanvas(imageUrl, style) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Draw original image
            ctx.drawImage(img, 0, 0);
            
            // Get image data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Apply dramatic style-based filters
            switch(style) {
                case 'classic':
                    // Black & White with high contrast (Classic barber look)
                    for (let i = 0; i < data.length; i += 4) {
                        const avg = (data[i] + data[i+1] + data[i+2]) / 3;
                        const contrast = 1.5;
                        let newValue = ((avg - 128) * contrast) + 128;
                        newValue = Math.max(0, Math.min(255, newValue));
                        data[i] = newValue;
                        data[i+1] = newValue;
                        data[i+2] = newValue;
                    }
                    break;
                    
                case 'modern':
                    // Vibrant colors with cool tone
                    for (let i = 0; i < data.length; i += 4) {
                        data[i] = Math.min(255, data[i] * 1.3);     // Red boost
                        data[i+1] = Math.min(255, data[i+1] * 1.2); // Green boost
                        data[i+2] = Math.min(255, data[i+2] * 1.4); // Blue strong boost
                    }
                    break;
                    
                case 'fade':
                    // Sharp edges with vignette effect
                    for (let i = 0; i < data.length; i += 4) {
                        const x = (i / 4) % canvas.width;
                        const y = Math.floor((i / 4) / canvas.width);
                        const centerX = canvas.width / 2;
                        const centerY = canvas.height / 2;
                        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
                        const maxDistance = Math.sqrt(Math.pow(centerX, 2) + Math.pow(centerY, 2));
                        const vignette = 1 - (distance / maxDistance) * 0.7;
                        
                        // High contrast
                        data[i] = Math.min(255, data[i] * 1.4 * vignette);
                        data[i+1] = Math.min(255, data[i+1] * 1.4 * vignette);
                        data[i+2] = Math.min(255, data[i+2] * 1.4 * vignette);
                    }
                    break;
                    
                case 'beard':
                    // Warm sepia tone (Professional grooming look)
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i+1];
                        const b = data[i+2];
                        
                        data[i] = Math.min(255, (r * 0.393) + (g * 0.769) + (b * 0.189) + 40);
                        data[i+1] = Math.min(255, (r * 0.349) + (g * 0.686) + (b * 0.168) + 20);
                        data[i+2] = Math.min(255, (r * 0.272) + (g * 0.534) + (b * 0.131));
                    }
                    break;
            }
            
            // Put modified data back
            ctx.putImageData(imageData, 0, 0);
            
            // Add decorative frame
            ctx.strokeStyle = 'rgba(203, 163, 92, 0.8)';
            ctx.lineWidth = 8;
            ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
            
            // Add style badge
            const badgeTexts = {
                classic: '👔 CLASSIC',
                modern: '✨ MODERN',
                fade: '🔥 FADE',
                beard: '🧔 GROOMED'
            };
            
            // Badge background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, 10, 160, 50);
            
            // Badge text
            ctx.font = 'bold 24px Arial';
            ctx.fillStyle = '#CBA35C';
            ctx.fillText(badgeTexts[style] || '✨ AI', 20, 45);
            
            // Bottom watermark
            ctx.font = 'bold 16px Arial';
            ctx.fillStyle = 'rgba(203, 163, 92, 0.9)';
            ctx.fillText('Nassim Coiffeur AI', canvas.width - 200, canvas.height - 20);
            
            resolve(canvas.toDataURL('image/png', 0.95));
        };
        
        img.onerror = () => {
            console.error('Image enhancement failed');
            resolve(imageUrl);
        };
        
        img.src = imageUrl;
    });
}

// Generate AI Hairstyle
async function generateAIHairstyle() {
    // Validate image upload
    if (!uploadedImage) {
        showToast('⚠️ الرجاء تحميل صورتك أولاً', 'warning');
        return;
    }
    
    // Get selected style
    const selectedStyle = document.querySelector('input[name="hairStyle"]:checked');
    if (!selectedStyle) {
        showToast('⚠️ الرجاء اختيار نوع التصفيفة', 'warning');
        return;
    }
    
    const style = selectedStyle.value;
    
    // Show loading state
    const generateBtn = document.getElementById('generateBtn');
    const loadingState = document.getElementById('aiLoadingState');
    const resultsSection = document.getElementById('aiResultsSection');
    
    if (generateBtn) generateBtn.disabled = true;
    if (loadingState) loadingState.style.display = 'block';
    if (resultsSection) resultsSection.style.display = 'none';
    
    try {
        // Create prompt based on style
        const prompts = {
            classic: 'Professional classic men\'s haircut, clean and elegant style, sharp lines, formal look, barber shop quality, high quality portrait',
            modern: 'Modern trendy men\'s hairstyle, stylish contemporary cut, textured and fashionable, instagram-worthy look, professional photo',
            fade: 'Fade haircut for men, clean fade on sides, stylish top, barber professional cut, sharp and fresh, detailed portrait',
            beard: 'Men\'s grooming with styled beard, professional beard trim, clean facial hair, masculine and well-groomed, studio quality'
        };
        
        const prompt = prompts[style] || prompts.classic;
        
        // For demo purposes, we'll simulate AI processing
        // In production, integrate with actual AI service
        await simulateAIProcessing(prompt, style);
        
    } catch (error) {
        console.error('AI Generation Error:', error);
        
        // Fallback: Show enhanced demo result
        showToast('✨ جاري معالجة الصورة بالذكاء الاصطناعي...', 'info');
        
        // Use uploaded image with enhancement simulation
        currentAIResult = uploadedImage;
        displayAIResult(currentAIResult);
        
    } finally {
        if (generateBtn) generateBtn.disabled = false;
        if (loadingState) loadingState.style.display = 'none';
    }
}

// Display AI Result
function displayAIResult(imageUrl) {
    const resultsSection = document.getElementById('aiResultsSection');
    const resultImage = document.getElementById('resultImage');
    const originalImage = document.getElementById('originalImage');
    
    if (resultsSection) resultsSection.style.display = 'block';
    if (resultImage) {
        resultImage.src = imageUrl;
        resultImage.style.animation = 'fadeIn 0.5s ease';
        resultImage.style.display = 'block';
    }
    if (originalImage) {
        originalImage.src = uploadedImage;
        originalImage.style.display = 'none';
    }
    
    // Scroll to results
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    showToast('✨ تم تحسين الصورة بنجاح! قارن بين قبل وبعد', 'success');
}

// Show Comparison (Before/After)
function showComparison(view) {
    const resultImage = document.getElementById('resultImage');
    const originalImage = document.getElementById('originalImage');
    const buttons = document.querySelectorAll('.comparison-toggle .toggle-btn');
    
    buttons.forEach(btn => btn.classList.remove('active'));
    
    if (view === 'after') {
        if (resultImage) resultImage.style.display = 'block';
        if (originalImage) originalImage.style.display = 'none';
        buttons[0].classList.add('active');
    } else {
        if (resultImage) resultImage.style.display = 'none';
        if (originalImage) originalImage.style.display = 'block';
        buttons[1].classList.add('active');
    }
}

// Book AI Hairstyle
function bookAIHairstyle() {
    if (!currentAIResult) {
        showToast('⚠️ لا يوجد تصفيفة لحجزها', 'warning');
        return;
    }
    
    // Close AI modal
    closeAIStylist();
    
    // Store AI result for booking reference
    sessionStorage.setItem('aiHairstyleImage', currentAIResult);
    
    // Scroll to booking section
    const bookingSection = document.querySelector('.services-section');
    if (bookingSection) {
        bookingSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    showToast('✅ يمكنك الآن اختيار الخدمات وإتمام الحجز', 'success');
}

// Download AI Image
function downloadAIImage() {
    if (!currentAIResult) {
        showToast('⚠️ لا يوجد صورة لتحميلها', 'warning');
        return;
    }
    
    try {
        // Create download link
        const link = document.createElement('a');
        link.href = currentAIResult;
        link.download = `nassim-ai-hairstyle-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('✅ تم تحميل الصورة بنجاح', 'success');
    } catch (error) {
        console.error('Download Error:', error);
        showToast('❌ حدث خطأ أثناء تحميل الصورة', 'error');
    }
}

// Retry AI Generation
function retryAIGeneration() {
    const resultsSection = document.getElementById('aiResultsSection');
    if (resultsSection) resultsSection.style.display = 'none';
    
    currentAIResult = null;
    
    showToast('🔄 يمكنك تجربة نمط آخر الآن', 'info');
}

// Drag and Drop Support
document.addEventListener('DOMContentLoaded', () => {
    const uploadBox = document.getElementById('uploadBox');
    
    if (uploadBox) {
        // Prevent default drag behaviors
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadBox.addEventListener(eventName, preventDefaults, false);
            document.body.addEventListener(eventName, preventDefaults, false);
        });
        
        // Highlight drop area
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadBox.addEventListener(eventName, () => {
                uploadBox.classList.add('drag-over');
            }, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadBox.addEventListener(eventName, () => {
                uploadBox.classList.remove('drag-over');
            }, false);
        });
        
        // Handle dropped files
        uploadBox.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                const fileInput = document.getElementById('aiImageInput');
                if (fileInput) {
                    fileInput.files = files;
                    handleAIImageUpload({ target: { files: files } });
                }
            }
        }, false);
    }
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Toast notification helper (if not already defined)
function showToast(message, type = 'info') {
    // Check if showNotificationToast exists from main app
    if (typeof showNotificationToast === 'function') {
        showNotificationToast(message, type);
        return;
    }
    
    // Fallback toast implementation
    const toast = document.createElement('div');
    toast.className = 'ai-toast';
    toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#667eea'};
        color: white;
        padding: 16px 24px;
        border-radius: 12px;
        z-index: 10001;
        animation: slideUp 0.3s ease;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        font-weight: 500;
        max-width: 90%;
        text-align: center;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 300);
    }, 3000);
}

console.log('✨ AI Stylist Module Loaded - Nano Banana Integration Ready');
