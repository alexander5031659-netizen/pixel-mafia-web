const axios = require('axios');

const proveedores = {
    groq: {
        nombre: 'GROQ',
        url: 'https://api.groq.com/openai/v1/chat/completions',
        modelos: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
        configurar: (config) => ({
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: {
                model: config.modelo || 'llama-3.3-70b-versatile',
                messages: [{ role: 'user', content: config.prompt }],
                max_tokens: 500,
                temperature: config.temperatura || 0.7
            }
        }),
        parsear: (res) => res.data.choices[0].message.content.trim()
    },

    openai: {
        nombre: 'OpenAI',
        url: 'https://api.openai.com/v1/chat/completions',
        modelos: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        configurar: (config) => ({
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: {
                model: config.modelo || 'gpt-4o-mini',
                messages: [{ role: 'user', content: config.prompt }],
                max_tokens: 500,
                temperature: config.temperatura || 0.7
            }
        }),
        parsear: (res) => res.data.choices[0].message.content.trim()
    },

    anthropic: {
        nombre: 'Anthropic Claude',
        url: 'https://api.anthropic.com/v1/messages',
        modelos: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'],
        configurar: (config) => ({
            headers: {
                'x-api-key': config.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: {
                model: config.modelo || 'claude-3-5-haiku-20241022',
                max_tokens: 500,
                messages: [{ role: 'user', content: config.prompt }],
                temperature: config.temperatura || 0.7
            }
        }),
        parsear: (res) => res.data.content[0].text.trim()
    },

    google: {
        nombre: 'Google Gemini',
        url: (config) => `https://generativelanguage.googleapis.com/v1beta/models/${config.modelo || 'gemini-2.0-flash'}:generateContent?key=${config.apiKey}`,
        modelos: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
        configurar: (config) => ({
            headers: { 'Content-Type': 'application/json' },
            body: {
                contents: [{ parts: [{ text: config.prompt }] }],
                generationConfig: {
                    maxOutputTokens: 500,
                    temperature: config.temperatura || 0.7
                }
            }
        }),
        parsear: (res) => res.data.candidates[0].content.parts[0].text.trim()
    },

    ollama: {
        nombre: 'Ollama (Local)',
        url: (config) => `${config.url || 'http://localhost:11434'}/api/generate`,
        modelos: ['llama3.2', 'mistral', 'phi3', 'gemma2', 'qwen2.5'],
        configurar: (config) => ({
            headers: { 'Content-Type': 'application/json' },
            body: {
                model: config.modelo || 'llama3.2',
                prompt: config.prompt,
                stream: false,
                options: {
                    temperature: config.temperatura || 0.7
                }
            }
        }),
        parsear: (res) => res.data.response.trim()
    },

    huggingface: {
        nombre: 'HuggingFace',
        url: (config) => `https://api-inference.huggingface.co/models/${config.modelo || 'mistralai/Mistral-7B-Instruct-v0.3'}`,
        modelos: ['mistralai/Mistral-7B-Instruct-v0.3', 'meta-llama/Meta-Llama-3-8B-Instruct', 'google/gemma-2-9b-it'],
        configurar: (config) => ({
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: {
                inputs: config.prompt,
                parameters: {
                    max_new_tokens: 500,
                    temperature: config.temperatura || 0.7,
                    return_full_text: false
                }
            }
        }),
        parsear: (res) => {
            if(Array.isArray(res.data)) return res.data[0].generated_text.trim();
            return res.data.generated_text.trim();
        }
    }
};

async function consultar(proveedor, config, prompt) {
    const prov = proveedores[proveedor];
    if(!prov) throw new Error(`Proveedor "${proveedor}" no existe`);
    if(!config.activo) throw new Error(`Proveedor "${prov.nombre}" no está activo`);

    const url = typeof prov.url === 'function' ? prov.url(config) : prov.url;
    const reqConfig = prov.configurar({ ...config, prompt });

    const res = await axios.post(url, reqConfig.body, {
        headers: reqConfig.headers,
        timeout: 30000
    });

    return prov.parsear(res);
}

async function consultarConFallback(configs, prompt) {
    for(const [proveedor, config] of Object.entries(configs)){
        if(!config.activo) continue;
        try{
            return await consultar(proveedor, config, prompt);
        }catch(e){
            console.log(`⚠️ ${proveedor} falló: ${e.message}`);
        }
    }
    throw new Error('Todos los proveedores fallaron');
}

function getInfo(){
    const info = {};
    for(const [key, prov] of Object.entries(proveedores)){
        info[key] = {
            nombre: prov.nombre,
            modelos: prov.modelos,
            requiereApiKey: key !== 'ollama',
            requiereUrl: key === 'ollama'
        };
    }
    return info;
}

module.exports = { consultar, consultarConFallback, getInfo, proveedores };
