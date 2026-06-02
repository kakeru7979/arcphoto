const ENDPOINT = 'https://arcphoto-face.cognitiveservices.azure.com/';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  const apiKey = process.env.AZURE_FACE_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'AZURE_FACE_KEY not set' }),
    };
  }

  let image;
  try {
    ({ image } = JSON.parse(event.body));
  } catch {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const url =
    ENDPOINT +
    'face/v1.0/detect?detectionModel=detection_03&returnFaceId=false&returnFaceLandmarks=false';

  const azureRes = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
      'Content-Type': 'application/octet-stream',
    },
    body: Buffer.from(image, 'base64'),
  });

  if (!azureRes.ok) {
    const detail = await azureRes.text();
    return {
      statusCode: azureRes.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Face API error', detail }),
    };
  }

  const faces = await azureRes.json();
  const rects = faces.map((f) => f.faceRectangle); // {top, left, width, height}

  return {
    statusCode: 200,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(rects),
  };
};
