import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';

async function main() {
  try {
    const zai = await ZAI.create();
    
    const imageBuffer = fs.readFileSync('/home/z/my-project/upload/dashboard_small.jpg');
    const base64Image = imageBuffer.toString('base64');
    
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Describe this dashboard image in detail. List every section, card, chart, number, color, text, and layout element you see.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ],
      thinking: { type: 'disabled' }
    });

    console.log(response.choices[0]?.message?.content);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
