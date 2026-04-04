const https = require("https");
require("dotenv").config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;

function groq(pregunta){
    return new Promise((resolve)=>{
        if(!GROQ_API_KEY) return resolve("Error IA");

        const body = JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
                { role: "system", content: "Eres Selena, IA con actitud y personalidad, habla en español, máximo 2 oraciones, sin links ni markdown." },
                { role: "user", content: pregunta }
            ],
            max_tokens: 150
        });

        const req = https.request({
            hostname:"api.groq.com",
            path:"/openai/v1/chat/completions",
            method:"POST",
            headers:{
                "Content-Type":"application/json",
                "Authorization":"Bearer " + GROQ_API_KEY
            }
        }, res=>{
            let data="";

            res.on("data", c => data += c);

            res.on("end", ()=>{
                try{
                    const json = JSON.parse(data);

                    if(json.error){
                        console.log("❌ Groq:", json.error.message);
                        if(json.error.message.includes("Access denied")){
                            console.log("   💡 Genera una nueva API key en: https://console.groq.com/keys");
                        }
                        return resolve("Error IA");
                    }

                    const txt = json.choices?.[0]?.message?.content || "No respuesta";
                    resolve(txt.trim().slice(0,280));

                }catch(e){
                    console.log("❌ Error parseando respuesta:", e.message);
                    resolve("Error IA");
                }
            });
        });

        req.on("error", ()=> resolve("Error conexion IA"));
        req.write(body);
        req.end();
    });
}

module.exports = { groq };