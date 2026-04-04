FROM node:18-slim

# Instalar dependencias del sistema: python3, pip, ffmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp
RUN pip3 install yt-dlp --break-system-packages

WORKDIR /app

# Instalar dependencias de Node
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Puerto por defecto (Koyeb inyecta el suyo, pero esto es fallback)
EXPOSE 8000

CMD ["node", "servidor.js"]
