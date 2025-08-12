import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';

interface QuestionRow {
  text: string;
  type: string;
  options: string;
  required: string;
  weightage: string;
  order: string;
  groupId: string;
  isGroupLead: string;
  requiresEvidence: string;
  evidenceDescription: string;
}

function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

function parseBoolean(value: string): boolean {
  return value.toUpperCase() === 'TRUE' || value === '1';
}

function parseOptions(optionsString: string): any {
  if (!optionsString || optionsString.trim() === '') {
    return null;
  }
  
  try {
    // Remove surrounding quotes if present
    const cleaned = optionsString.replace(/^["']|["']$/g, '');
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Error parsing options:', error, optionsString);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const variableId = formData.get('variableId') as string;

    if (!file || !variableId) {
      return NextResponse.json(
        { error: 'File and variableId are required' },
        { status: 400 }
      );
    }

    const questions = [];
    const errors = [];

    // Determine file type and parse accordingly
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse Excel file
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      for (let i = 0; i < data.length; i++) {
        const row: any = data[i];
        
        try {
          // Extract question data from Excel row
          const questionText = row['Question Text'];
          const type = row['Type'];
          
          if (!questionText || !type) {
            errors.push(`Row ${i + 2}: Missing question text or type`);
            continue;
          }

          // Validate type
          if (!['single_select', 'multi_select', 'text'].includes(type)) {
            errors.push(`Row ${i + 2}: Invalid type "${type}"`);
            continue;
          }

          // Build options from Excel columns
          let options = null;
          if (type !== 'text') {
            options = [];
            for (let j = 1; j <= 5; j++) {
              const optionText = row[`Option ${j}`];
              const absoluteScore = row[`Option ${j} Absolute Score`];
              const internalScore = row[`Option ${j} Internal Score`];
              
              if (optionText && optionText.toString().trim()) {
                options.push({
                  text: optionText.toString(),
                  absoluteScore: parseFloat(absoluteScore) || 0,
                  internalScore: parseFloat(internalScore) || 0
                });
              }
            }

            if (options.length === 0) {
              errors.push(`Row ${i + 2}: No options provided for select type question`);
              continue;
            }
          }

          questions.push({
            text: questionText,
            type,
            options,
            required: parseBoolean(row['Required']?.toString() || 'TRUE'),
            weightage: parseFloat(row['Weightage']) || 1.0,
            order: parseInt(row['Order']) || (i + 1),
            groupId: row['Group ID']?.toString() || null,
            isGroupLead: parseBoolean(row['Is Group Lead']?.toString() || 'FALSE'),
            requiresEvidence: parseBoolean(row['Requires Evidence']?.toString() || 'FALSE'),
            evidenceDescription: row['Evidence Description']?.toString() || null,
            variableId
          });
        } catch (error) {
          console.error(`Error parsing Excel row ${i + 2}:`, error);
          errors.push(`Row ${i + 2}: ${error}`);
        }
      }
    } else if (fileExtension === 'csv') {
      // Parse CSV file (existing logic)
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header row
      const dataLines = lines.slice(1);

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        if (!line.trim()) continue;
        
        try {
          const values = parseCSVLine(line);
          
          if (values.length < 10) {
            errors.push(`Row ${i + 2}: Insufficient columns`);
            continue;
          }

          const [
            text,
            type,
            optionsStr,
            requiredStr,
            weightageStr,
            orderStr,
            groupId,
            isGroupLeadStr,
            requiresEvidenceStr,
            evidenceDescription
          ] = values;

          // Validate type
          if (!['single_select', 'multi_select', 'text'].includes(type)) {
            errors.push(`Row ${i + 2}: Invalid type "${type}"`);
            continue;
          }

          // Parse options for non-text questions
          let options = null;
          if (type !== 'text') {
            options = parseOptions(optionsStr);
            if (!options || !Array.isArray(options)) {
              errors.push(`Row ${i + 2}: Invalid options format`);
              continue;
            }
          }

          questions.push({
            text,
            type,
            options,
            required: parseBoolean(requiredStr),
            weightage: parseFloat(weightageStr) || 1.0,
            order: parseInt(orderStr) || (i + 1),
            groupId: groupId || null,
            isGroupLead: parseBoolean(isGroupLeadStr),
            requiresEvidence: parseBoolean(requiresEvidenceStr),
            evidenceDescription: evidenceDescription || null,
            variableId
          });
        } catch (error) {
          console.error(`Error parsing CSV row ${i + 2}:`, error);
          errors.push(`Row ${i + 2}: ${error}`);
        }
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported file format. Please upload CSV or Excel files.' },
        { status: 400 }
      );
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { 
          error: 'Some rows had errors',
          details: errors,
          successCount: questions.length 
        },
        { status: 400 }
      );
    }

    // Create all questions in database
    const createdQuestions = await prisma.variableQuestion.createMany({
      data: questions
    });

    return NextResponse.json({
      message: `Successfully created ${createdQuestions.count} questions`,
      count: createdQuestions.count
    });
  } catch (error) {
    console.error('Error processing bulk upload:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk upload' },
      { status: 500 }
    );
  }
}