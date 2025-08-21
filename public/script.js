// 全局变量
let currentCardData = null;
let isGenerating = false;

// DOM元素
const questionInput = document.getElementById('questionInput');
const modelSelect = document.getElementById('modelSelect');
const generateBtn = document.getElementById('generateBtn');
const cardContainer = document.getElementById('cardContainer');
const loadingState = document.getElementById('loadingState');
const cardActions = document.getElementById('cardActions');
const settingsModal = document.getElementById('settingsModal');
const apiKeyInput = document.getElementById('apiKeyInput');

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupEventListeners();
});

// 设置事件监听器
function setupEventListeners() {
    // 生成按钮点击事件
    generateBtn.addEventListener('click', generateCard);
    
    // 输入框回车事件
    questionInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            generateCard();
        }
    });
    
    // 模型选择变化事件
    modelSelect.addEventListener('change', function() {
        saveSettings();
    });
}

// 加载设置
function loadSettings() {
    const defaultApiKey = 'AIzaSyDNncAIBEoTD9pjKAXEa63Y7oOg1bjN3hs';
    const apiKey = localStorage.getItem('gemini_api_key') || defaultApiKey;
    const model = localStorage.getItem('gemini_model') || 'gemini-2.0-flash';
    const autoSave = localStorage.getItem('auto_save');
    const showProcess = localStorage.getItem('show_process');
    const simpleMode = localStorage.getItem('simple_mode');
    
    apiKeyInput.value = apiKey;
    
    // 同步主页面和设置页面的模型选择
    modelSelect.value = model;
    const settingsModelSelect = document.getElementById('settingsModelSelect');
    if (settingsModelSelect) {
        settingsModelSelect.value = model;
        // 添加设置页面模型选择的事件监听
        settingsModelSelect.addEventListener('change', function() {
            modelSelect.value = this.value;
            localStorage.setItem('gemini_model', this.value);
        });
    }
    
    if (autoSave !== null) {
        document.getElementById('autoSave').checked = autoSave === 'true';
    }
    if (showProcess !== null) {
        document.getElementById('showProcess').checked = showProcess === 'true';
    }
    if (simpleMode !== null) {
        document.getElementById('simpleMode').checked = simpleMode === 'true';
    }
}

// 保存设置
function saveSettings() {
    localStorage.setItem('gemini_api_key', apiKeyInput.value);
    localStorage.setItem('gemini_model', modelSelect.value);
    localStorage.setItem('auto_save', document.getElementById('autoSave').checked);
    localStorage.setItem('show_process', document.getElementById('showProcess').checked);
    localStorage.setItem('simple_mode', document.getElementById('simpleMode').checked);
    
    alert('设置已保存！');
    closeSettings();
}

// 打开设置弹窗
function openSettings() {
    settingsModal.style.display = 'block';
}

// 关闭设置弹窗
function closeSettings() {
    settingsModal.style.display = 'none';
}

// 测试API密钥
async function testApiKey() {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert('请先输入API密钥');
        return;
    }
    
    try {
        const response = await fetch('/test-api', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ apiKey })
        });
        
        const result = await response.json();
        if (result.success) {
            alert('API密钥测试成功！');
        } else {
            alert('API密钥测试失败：' + result.error);
        }
    } catch (error) {
        alert('测试失败：网络错误');
    }
}

// 设置问题
function setQuestion(question) {
    questionInput.value = question;
    questionInput.focus();
}

// 生成知识卡片
async function generateCard() {
    const question = questionInput.value.trim();
    const apiKey = localStorage.getItem('gemini_api_key') || 'AIzaSyDNncAIBEoTD9pjKAXEa63Y7oOg1bjN3hs';
    const model = modelSelect.value;
    
    console.log(`选择的模型: ${model}`); // 添加日志
    
    // 验证输入
    if (!question) {
        alert('请输入你想了解的知识问题');
        questionInput.focus();
        return;
    }
    
    if (isGenerating) {
        return;
    }
    
    isGenerating = true;
    
    // 显示加载状态
    showLoading();
    updateGenerateButton(true);
    
    try {
        const response = await fetch('/generate-card', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: question,
                apiKey: apiKey,
                model: model, // 确保模型值正确传递
                simpleMode: localStorage.getItem('simple_mode') === 'true'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            currentCardData = result.data;
            displayCard(result.html);
            showCardActions();
            
            // 自动保存
            if (localStorage.getItem('auto_save') === 'true') {
                saveCardToHistory(question, result.html);
            }
        } else {
            showError('生成失败：' + result.error);
        }
    } catch (error) {
        console.error('生成卡片错误:', error);
        showError('网络错误，请检查连接后重试');
    } finally {
        hideLoading();
        updateGenerateButton(false);
        isGenerating = false;
    }
}

// 显示加载状态
function showLoading() {
    loadingState.style.display = 'flex';
    cardActions.style.display = 'none';
}

// 隐藏加载状态
function hideLoading() {
    loadingState.style.display = 'none';
}

// 更新生成按钮状态
function updateGenerateButton(loading) {
    if (loading) {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在制作知识卡片...';
    } else {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> 制作我的知识卡片';
    }
}

// 显示卡片
function displayCard(html) {
    // 如果是完整的HTML文档，使用iframe显示
    if (html.includes('<!DOCTYPE html>') || html.includes('<html')) {
        // 创建一个iframe来渲染完整的HTML
        const iframe = document.createElement('iframe');
        iframe.style.width = '100%';
        iframe.style.height = 'auto';
        iframe.style.minHeight = '800px';
        iframe.style.border = 'none';
        iframe.style.display = 'block';
        iframe.style.backgroundColor = '#fff';
        iframe.style.borderRadius = '4px';
        
        cardContainer.innerHTML = '';
        cardContainer.appendChild(iframe);
        
        // 直接设置src为data URL
        iframe.src = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
        
        // 监听iframe加载完成，调整高度
        iframe.onload = function() {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                const body = iframeDoc.body;
                if (body) {
                    // 让iframe内容自适应
                    body.style.margin = '0';
                    body.style.padding = '20px';
                    body.style.overflow = 'visible';
                    body.style.height = 'auto';
                    
                    // 调整iframe高度以适应内容
                    setTimeout(() => {
                        try {
                            const height = Math.max(
                                body.scrollHeight,
                                body.offsetHeight,
                                iframeDoc.documentElement.clientHeight,
                                iframeDoc.documentElement.scrollHeight,
                                iframeDoc.documentElement.offsetHeight
                            );
                            iframe.style.height = Math.max(height + 40, 800) + 'px';
                        } catch (e) {
                            console.log('无法调整iframe高度:', e);
                            iframe.style.height = '800px';
                        }
                    }, 500);
                }
            } catch (e) {
                console.log('无法访问iframe内容，使用默认设置');
                iframe.style.height = '800px';
            }
        };
        
    } else {
        // 如果是HTML片段，使用html-content类包装
        const contentDiv = document.createElement('div');
        contentDiv.className = 'html-content';
        contentDiv.innerHTML = html;
        
        cardContainer.innerHTML = '';
        cardContainer.appendChild(contentDiv);
        
        // 确保图标正确加载
        setTimeout(() => {
            const icons = cardContainer.querySelectorAll('iconify-icon');
            if (icons.length > 0) {
                console.log(`加载了 ${icons.length} 个图标`);
            }
        }, 500);
    }
}

// 显示错误
function showError(message) {
    cardContainer.innerHTML = `
        <div class="error-state" style="padding: 2rem; text-align: center; height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: center;">
            <div class="error-icon">⚠️</div>
            <h3>生成失败</h3>
            <p>${message}</p>
            <button onclick="generateCard()" class="retry-btn">
                <i class="fas fa-redo"></i> 重试
            </button>
        </div>
    `;
}

// 显示卡片操作按钮
function showCardActions() {
    cardActions.style.display = 'flex';
}

// 重新生成卡片
function regenerateCard() {
    generateCard();
}

// 下载PNG
async function downloadPNG() {
    const iframe = cardContainer.querySelector('iframe');
    if (iframe) {
        // 如果是iframe，需要从iframe中获取内容
        try {
            // 动态加载html2canvas
            if (typeof html2canvas === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                document.head.appendChild(script);
                
                await new Promise((resolve) => {
                    script.onload = resolve;
                });
            }
            
            const canvas = await html2canvas(iframe.contentDocument.body, {
                backgroundColor: '#f4f1ea',
                scale: 2,
                useCORS: true,
                allowTaint: true,
                height: iframe.contentDocument.body.scrollHeight,
                width: iframe.contentDocument.body.scrollWidth
            });
            
            const link = document.createElement('a');
            link.download = `知识卡片-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('下载PNG失败:', error);
            alert('下载失败，请重试');
        }
    } else {
        // 如果不是iframe，使用原来的方法
        const cardElement = cardContainer.querySelector('div') || cardContainer;
        if (!cardElement) {
            alert('没有可下载的卡片');
            return;
        }
        
        try {
            // 动态加载html2canvas
            if (typeof html2canvas === 'undefined') {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
                document.head.appendChild(script);
                
                await new Promise((resolve) => {
                    script.onload = resolve;
                });
            }
            
            const canvas = await html2canvas(cardElement, {
                backgroundColor: '#f4f1ea',
                scale: 2,
                useCORS: true
            });
            
            const link = document.createElement('a');
            link.download = `知识卡片-${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (error) {
            console.error('下载PNG失败:', error);
            alert('下载失败，请重试');
        }
    }
}

// 下载HTML
function downloadHTML() {
    const iframe = cardContainer.querySelector('iframe');
    if (iframe) {
        // 如果是iframe，获取iframe中的HTML内容
        try {
            const htmlContent = iframe.contentDocument.documentElement.outerHTML;
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `知识卡片-${new Date().getTime()}.html`;
            link.click();
        } catch (error) {
            console.error('下载HTML失败:', error);
            alert('下载失败，请重试');
        }
    } else if (currentCardData) {
        // 使用原来的方法
        try {
            fetch('/template')
                .then(response => response.text())
                .then(template => {
                    let html = template;
                    Object.keys(currentCardData).forEach(key => {
                        const placeholder = `{{${key}}}`;
                        html = html.replace(new RegExp(placeholder, 'g'), currentCardData[key] || '');
                    });
                    
                    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `知识卡片-${new Date().getTime()}.html`;
                    link.click();
                });
        } catch (error) {
            console.error('下载HTML失败:', error);
            alert('下载失败，请重试');
        }
    } else {
        alert('没有可下载的卡片');
    }
}

// 分享卡片
function shareCard() {
    if (!currentCardData) {
        alert('没有可分享的卡片');
        return;
    }
    
    // 创建分享链接
    const shareData = {
        title: '小朋友知识卡片',
        text: `我刚刚学习了"${currentCardData.MAIN_TITLE}"的知识，快来看看吧！`,
        url: window.location.href
    };
    
    if (navigator.share) {
        navigator.share(shareData);
    } else {
        // 复制到剪贴板
        const textToCopy = `${shareData.text}\n${shareData.url}`;
        navigator.clipboard.writeText(textToCopy).then(() => {
            alert('分享链接已复制到剪贴板');
        }).catch(() => {
            alert('分享功能暂不可用');
        });
    }
}

// 保存卡片到历史记录
function saveCardToHistory(question, html) {
    try {
        let history = JSON.parse(localStorage.getItem('card_history') || '[]');
        history.unshift({
            id: Date.now(),
            question: question,
            html: html,
            timestamp: new Date().toISOString()
        });
        
        // 只保留最近20条记录
        history = history.slice(0, 20);
        localStorage.setItem('card_history', JSON.stringify(history));
    } catch (error) {
        console.error('保存历史记录失败:', error);
    }
}

// 点击模态框外部关闭
window.addEventListener('click', function(event) {
    if (event.target === settingsModal) {
        closeSettings();
    }
});

// 键盘快捷键
document.addEventListener('keydown', function(event) {
    // Ctrl/Cmd + Enter 生成卡片
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (!isGenerating) {
            generateCard();
        }
    }
    
    // Esc 关闭设置弹窗
    if (event.key === 'Escape') {
        closeSettings();
    }
});

// 添加CSS样式到页面
const additionalStyles = `
.error-state {
    text-align: center;
    color: #e74c3c;
    padding: 2rem;
}

.error-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.retry-btn {
    background: #e74c3c;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    cursor: pointer;
    margin-top: 1rem;
    transition: all 0.3s ease;
}

.retry-btn:hover {
    background: #c0392b;
    transform: translateY(-2px);
}
`;

// 添加样式到页面
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);