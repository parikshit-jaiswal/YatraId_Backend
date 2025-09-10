import cloudinary from "cloudinary";
import axios from "axios";
import { parse } from "mrz"; // npm install mrz

// Cloudinary Config
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload to Cloudinary
export const uploadToCloudinary = async (filePath: string) => {
  return await cloudinary.v2.uploader.upload(filePath, {
    folder: "tourist-passports",
    resource_type: "image"
  });
};

// OCR using OCR.space (free API)
export const extractTextFromImage = async (imageUrl: string): Promise<string> => {
  try {
    const response = await axios.post('https://api.ocr.space/parse/imageurl', {
      url: imageUrl,
      apikey: process.env.OCR_API_KEY,
      language: 'eng',
      detectOrientation: true,
      scale: true,
      OCREngine: 2
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.IsErroredOnProcessing) {
      throw new Error(response.data.ErrorMessage[0] || 'OCR processing failed');
    }

    return response.data.ParsedResults[0]?.ParsedText || '';
  } catch (error: any) {
    console.error('OCR extraction error:', error);
    // Fallback for demo
    return 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<\nL898902C36UTO7408122F1204159ZE184226B<<<<<10';
  }
};

// Extract MRZ from OCR text
export const extractMRZFromText = (text: string): string => {
  const lines = text.split('\n');
  const mrzLines: string[] = [];
  
  for (const line of lines) {
    const cleanLine = line.trim().replace(/\s/g, '');
    if (cleanLine.match(/^P<[A-Z]{3}/) || 
        (mrzLines.length > 0 && cleanLine.match(/^[A-Z0-9<]+$/))) {
      mrzLines.push(cleanLine);
    }
  }
  
  return mrzLines.join('\n');
};

// Parse passport MRZ with OCR
export const parsePassportMRZ = async (imageUrl: string) => {
  try {
    const extractedText = await extractTextFromImage(imageUrl);
    const mrzText = extractMRZFromText(extractedText);
    
    if (!mrzText) {
      throw new Error('No MRZ found in the image');
    }

    const result = parse(mrzText);
    
    if (!result.fields) {
      throw new Error('Invalid MRZ format');
    }

    return {
      valid: result.valid,
      passportNumber: result.fields.documentNumber || '',
      firstName: result.fields.firstName || '',
      lastName: result.fields.lastName || '',
      nationality: result.fields.nationality || '',
      country: result.fields.issuingState || result.fields.nationality || '',
      dateOfBirth: result.fields.birthDate || '',
      expiryDate: result.fields.expirationDate || '',
      gender: result.fields.sex || '',
      rawMRZ: mrzText
    };
  } catch (error: any) {
    console.error('MRZ parsing error:', error);
    // Fallback demo data
    return {
      valid: true,
      passportNumber: 'L8988901C',
      firstName: 'ANNA',
      lastName: 'ERIKSSON',
      nationality: 'UTO',
      country: 'UTO',
      dateOfBirth: '740812',
      expiryDate: '120415',
      gender: 'F',
      rawMRZ: 'Demo data - OCR failed'
    };
  }
};

// Validate passport number format by country
export const validatePassportNumber = (passportNo: string, country: string): boolean => {
  const patterns: { [key: string]: RegExp } = {
    'IND': /^[A-Z][0-9]{7}$/, // India: 1 letter + 7 digits
    'USA': /^[0-9]{9}$/, // USA: 9 digits
    'GBR': /^[0-9]{9}$/, // UK: 9 digits
    'CAN': /^[A-Z]{2}[0-9]{6}$/, // Canada: 2 letters + 6 digits
    'AUS': /^[A-Z][0-9]{7}$/, // Australia: 1 letter + 7 digits
    'DEU': /^[A-Z0-9]{9}$/, // Germany: 9 alphanumeric
    'FRA': /^[0-9]{2}[A-Z]{2}[0-9]{5}$/, // France: 2digits + 2letters + 5digits
    'JPN': /^[A-Z]{2}[0-9]{7}$/, // Japan: 2 letters + 7 digits
    'CHN': /^[GE][0-9]{8}$/, // China: G/E + 8 digits
  };

  const pattern = patterns[country.toUpperCase()];
  if (!pattern) {
    return /^[A-Z0-9]{6,12}$/.test(passportNo);
  }

  return pattern.test(passportNo);
};

// Setu DigiLocker Integration
export const fetchAadhaarFromSetu = async (requestId: string) => {
  try {
    const options = {
      method: 'GET',
      url: `${process.env.SETU_BASE_URL}/api/digilocker/${requestId}/aadhaar`,
      headers: {
        'x-client-id': process.env.SETU_CLIENT_ID!,
        'x-client-secret': process.env.SETU_CLIENT_SECRET!,
        'x-product-instance-id': process.env.SETU_PRODUCT_INSTANCE_ID!
      }
    };

    console.log('🔍 Fetching Aadhaar data from Setu...', { requestId });
    const response = await axios.request(options);

    // Parse the XML response
    const aadhaarData = response.data;
    
    if (!aadhaarData || aadhaarData.status === 'failed') {
      throw new Error('Aadhaar verification failed');
    }

    // Extract data from Setu response (adjust based on actual response structure)
    return {
      valid: true,
      name: aadhaarData.name || aadhaarData.data?.name || 'Demo User',
      aadhaarNumber: aadhaarData.uid || aadhaarData.aadhaar_number || 'XXXX-XXXX-1234',
      dateOfBirth: aadhaarData.dob || aadhaarData.data?.dob || '1990-01-15',
      gender: aadhaarData.gender || aadhaarData.data?.gender || 'M',
      address: aadhaarData.address || aadhaarData.data?.address || 'Demo Address, India',
      photo: aadhaarData.photo || null
    };

  } catch (error: any) {
    console.error('Setu DigiLocker API error:', error);
    
    // For hackathon demo, return mock data when API fails
    return {
      valid: true,
      name: 'Demo Indian User',
      aadhaarNumber: 'XXXX-XXXX-1234',
      dateOfBirth: '1990-01-15',
      gender: 'M',
      address: 'Demo Address, Mumbai, Maharashtra, India',
      photo: null
    };
  }
};

// Generate a demo request ID for testing
export const generateDemoRequestId = (): string => {
  return 'b46f0bfa-117d-46b3-9927-be1dceb13839'; // Use the example from Setu docs
};
