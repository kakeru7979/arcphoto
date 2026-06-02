const { app } = require('@azure/functions');

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

app.http('faceDetect', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    if (request.method === 'OPTIONS') {
      return { status: 200, headers: CORS };
    }

    const apiKey = process.env.AZURE_FACE_API_KEY;
    const endpoint = process.env.AZURE_FACE_ENDPOINT
      || 'https://arcphoto-face.cognitiveservices.azure.com/';

    if (!apiKey) {
      return { status: 500, jsonBody: { error: 'AZURE_FACE_API_KEY not set' }, headers: CORS };
    }

    try {
      const { image } = await request.json();
      const imageBuffer = Buffer.from(image, 'base64');

      const url = `${endpoint}face/v1.0/detect` +
        '?detectionModel=detection_03&returnFaceId=false&returnFaceLandmarks=false';

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/octet-stream',
        },
        body: imageBuffer,
      });

      if (!res.ok) {
        const msg = await res.text();
        context.error('Face API:', res.status, msg);
        return { status: res.status, jsonBody: { error: 'Face API error' }, headers: CORS };
      }

      const faces = await res.json();
      const rects = faces.map(f => f.faceRectangle); // {top, left, width, height}

      return { jsonBody: rects, headers: CORS };
    } catch (err) {
      context.error('Proxy error:', err);
      return { status: 500, jsonBody: { error: 'Internal error' }, headers: CORS };
    }
  },
});
