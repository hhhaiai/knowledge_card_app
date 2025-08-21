const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.static('public'));

// 读取模板文件
function getTemplate() {
    try {
        return fs.readFileSync(path.join(__dirname, 'Template.html'), 'utf8');
    } catch (error) {
        console.error('读取模板文件失败:', error);
        return null;
    }
}

// 生成知识卡片的提示词
function generatePrompt(question, simpleMode = false) {
    const complexity = simpleMode ? '用简单易懂的语言，适合小朋友理解' : '用生动有趣的语言';
    
    // 读取模板文件作为样例
    let templateHtml = '';
    try {
        templateHtml = fs.readFileSync(path.join(__dirname, 'Template.html'), 'utf8');
    } catch (error) {
        console.error('读取模板文件失败:', error);
        templateHtml = '<!-- 模板读取失败 -->';
    }
    
    return `你是一个专业的儿童教育专家，请根据以下问题生成一个知识卡片的内容。${complexity}。

问题：${question}

生成结果是一个html格式，样例html如下：

\`\`\`html
${templateHtml}
\`\`\`

请根据问题内容，生成一个完整的HTML知识卡片，可以参考样例但不必完全照搬结构，可以根据内容需要自由调整。

要求：
1. 内容要准确、有趣、适合儿童理解
2. 使用合适的emoji图标（noto系列，如noto:star、noto:rocket、noto:rainbow等）
3. 重点词汇用highlight类标记，如<span class='highlight'>重点词汇</span>
4. 蓝色高亮用<span class='highlight-blue'>蓝色文字</span>，绿色高亮用<span class='highlight-green'>绿色文字</span>
5. 内容要有教育意义，语言要生动活泼
6. 可以根据内容需要增加或减少卡片数量
7. 可以自由调整布局和结构，但保持整体风格一致

只返回完整的HTML代码，不要包含任何其他解释或说明。`;
}

// 调用知识卡片生成API
async function callGeminiAPI(prompt, apiKey, model) {
    // 确保模型名称正确
    const modelName = model || 'gemini-2.0-flash';
    console.log(`使用模型: ${modelName}`);
    
    try {
        // 使用备用API
        console.log(`使用备用API生成卡片...`);
        
        // 提取问题内容
        const questionMatch = prompt.match(/问题：(.*?)(\n|$)/);
        const question = questionMatch ? questionMatch[1].trim() : prompt;
        
        console.log(`提取的问题: "${question}"`);
        
        const response = await axios.post(
            'https://v0-card-generation-app.vercel.app/api/generate-card',
            {
                input: question,
                model: "gemini-2.0-flash-exp", // 使用固定的模型
                customApiKey: ""  // 使用默认API密钥
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36',
                    'Origin': 'https://v0-card-generation-app.vercel.app',
                    'Referer': 'https://v0-card-generation-app.vercel.app/'
                },
                timeout: 60000
            }
        );
        
        if (response.data && response.data.html) {
            console.log('备用API响应成功，HTML长度:', response.data.html.length);
            return response.data.html;
        } else if (response.data && response.data.content) {
            // 处理content字段
            console.log('备用API响应成功(content格式)，HTML长度:', response.data.content.length);
            return response.data.content;
        } else {
            console.error('备用API响应格式异常:', response.data);
            throw new Error('备用API响应格式错误');
        }
    } catch (error) {
        console.error('备用API调用失败:', error.response?.data || error.message);
        throw new Error(error.response?.data?.error || '备用API调用失败');
    }
}

// 提取HTML内容
function extractHtmlContent(response) {
    try {
        // 直接返回响应内容，因为备用API已经返回了完整的HTML
        if (response && response.trim().length > 0) {
            console.log('提取HTML内容成功，长度:', response.length);
            return response.trim();
        }
        
        console.error('响应内容为空');
        return null;
    } catch (error) {
        console.error('提取HTML内容失败:', error);
        return null;
    }
}

// API路由

// 测试API密钥
app.post('/test-api', async (req, res) => {
    try {
        const { apiKey } = req.body;
        
        if (!apiKey) {
            return res.json({ success: false, error: 'API密钥不能为空' });
        }
        
        // 发送简单的测试请求
        await callGeminiAPI('你好，请回复"测试成功"', apiKey);
        
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// 生成知识卡片
app.post('/generate-card', async (req, res) => {
    try {
        const { question, apiKey, model, simpleMode } = req.body;
        
        if (!question) {
            return res.json({ success: false, error: '问题不能为空' });
        }
        
        // 确保使用前端传递的模型
        const selectedModel = model || 'gemini-2.0-flash';
        console.log(`开始生成卡片，问题: "${question.substring(0, 30)}...", 使用模型: ${selectedModel}`);
        
        // 生成提示词
        const prompt = generatePrompt(question, simpleMode);
        
        // 最多尝试3次
        let attempts = 0;
        let maxAttempts = 3;
        let htmlContent = null;
        let error = null;
        
        while (attempts < maxAttempts && !htmlContent) {
            attempts++;
            try {
                console.log(`尝试 ${attempts}/${maxAttempts} 生成卡片...`);
                
                // 调用Gemini API
                const aiResponse = await callGeminiAPI(prompt, apiKey || '', selectedModel);
                
                // 提取HTML内容
                htmlContent = extractHtmlContent(aiResponse);
                
                if (!htmlContent || htmlContent.trim().length < 100) {
                    console.warn(`生成的HTML内容无效或太短`);
                    htmlContent = null;
                    throw new Error(`AI响应内容无效`);
                }
                
            } catch (err) {
                console.error(`尝试 ${attempts} 失败:`, err.message);
                error = err;
                // 短暂延迟后重试
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        
        if (!htmlContent) {
            return res.json({ 
                success: false, 
                error: `生成失败，已尝试 ${maxAttempts} 次: ${error?.message || '未知错误'}` 
            });
        }
        
        console.log('卡片生成成功');
        
        res.json({
            success: true,
            html: htmlContent,
            data: { MAIN_TITLE: question } // 简化的数据对象，保持与前端兼容
        });
        
    } catch (error) {
        console.error('生成卡片失败:', error);
        res.json({ success: false, error: error.message });
    }
});

// 获取模板
app.get('/template', (req, res) => {
    try {
        const template = getTemplate();
        if (!template) {
            return res.status(404).send('模板文件未找到');
        }
        res.send(template);
    } catch (error) {
        res.status(500).send('读取模板失败');
    }
});

// 健康检查
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`🚀 知识卡片应用已启动`);
    console.log(`📱 本地访问: http://localhost:${PORT}`);
    console.log(`⚙️  环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📝 模板文件: ${fs.existsSync(path.join(__dirname, 'Template.html')) ? '✅ 已找到' : '❌ 未找到'}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('收到SIGTERM信号，正在关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('收到SIGINT信号，正在关闭服务器...');
    process.exit(0);
});