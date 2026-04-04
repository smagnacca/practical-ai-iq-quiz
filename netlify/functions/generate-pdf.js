/**
 * Netlify Function: generate-pdf
 *
 * Receives quiz data (base64 encoded) and generates a personalized PDF.
 *
 * Usage:
 *   POST /.netlify/functions/generate-pdf
 *   Body: { data: "base64_encoded_quiz_results" }
 *
 *   Response: PDF file (application/pdf)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

exports.handler = async (event, context) => {
  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const base64Data = body.data || event.queryStringParameters?.data;

    if (!base64Data) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing data parameter' })
      };
    }

    // Validate base64 format
    if (!/^[A-Za-z0-9+/=]+$/.test(base64Data)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid base64 format' })
      };
    }

    // Create temporary output file
    const tempDir = os.tmpdir();
    const outputPath = path.join(tempDir, `report-${Date.now()}.pdf`);

    // Path to Python script
    const pythonScript = path.join(__dirname, '../../generate-pdf.py');

    // Execute ReportLab script
    try {
      execSync(`python3 ${pythonScript} "${base64Data}" "${outputPath}"`, {
        encoding: 'utf-8',
        timeout: 30000, // 30 second timeout
        stdio: 'pipe'
      });
    } catch (execError) {
      console.error('Python execution error:', execError.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'PDF generation failed' })
      };
    }

    // Check if PDF was created
    if (!fs.existsSync(outputPath)) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'PDF file not created' })
      };
    }

    // Read PDF file
    const pdfBuffer = fs.readFileSync(outputPath);

    // Clean up temp file
    fs.unlinkSync(outputPath);

    // Return PDF with proper headers
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="AI_Skills_IQ_Report.pdf"',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      },
      body: pdfBuffer.toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
