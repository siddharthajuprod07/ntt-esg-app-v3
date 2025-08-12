import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function POST(request: NextRequest) {
  try {
    const { data } = await request.json();

    // Create a new workbook and worksheet
    const workbook = XLSX.utils.book_new();
    
    // Create worksheet from the data
    const worksheet = XLSX.utils.json_to_sheet(data);

    // Set column widths for better readability
    const colWidths = [
      { wch: 60 }, // Question Text
      { wch: 15 }, // Type
      { wch: 20 }, // Option 1
      { wch: 15 }, // Option 1 Absolute Score
      { wch: 15 }, // Option 1 Internal Score
      { wch: 20 }, // Option 2
      { wch: 15 }, // Option 2 Absolute Score
      { wch: 15 }, // Option 2 Internal Score
      { wch: 20 }, // Option 3
      { wch: 15 }, // Option 3 Absolute Score
      { wch: 15 }, // Option 3 Internal Score
      { wch: 20 }, // Option 4
      { wch: 15 }, // Option 4 Absolute Score
      { wch: 15 }, // Option 4 Internal Score
      { wch: 20 }, // Option 5
      { wch: 15 }, // Option 5 Absolute Score
      { wch: 15 }, // Option 5 Internal Score
      { wch: 10 }, // Required
      { wch: 10 }, // Weightage
      { wch: 8 },  // Order
      { wch: 20 }, // Group ID
      { wch: 12 }, // Is Group Lead
      { wch: 15 }, // Requires Evidence
      { wch: 50 }  // Evidence Description
    ];
    
    worksheet['!cols'] = colWidths;

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions Template');

    // Create instructions sheet
    const instructionsData = [
      { Field: 'Question Text', Description: 'The actual question text that will be displayed to users', Example: 'What is your carbon footprint?' },
      { Field: 'Type', Description: 'Question type: single_select, multi_select, or text', Example: 'single_select' },
      { Field: 'Option 1-5', Description: 'Answer options (leave empty for unused options). Not used for text questions.', Example: 'Yes' },
      { Field: 'Option X Absolute Score', Description: 'Absolute scoring for each option (0-10 typically)', Example: '10' },
      { Field: 'Option X Internal Score', Description: 'Internal scoring for each option (used for calculations)', Example: '8' },
      { Field: 'Required', Description: 'TRUE if question is mandatory, FALSE if optional', Example: 'TRUE' },
      { Field: 'Weightage', Description: 'Question importance weight (decimal number)', Example: '1.5' },
      { Field: 'Order', Description: 'Display order within the variable (integer)', Example: '1' },
      { Field: 'Group ID', Description: 'Optional: Group related questions together', Example: 'carbon-emissions' },
      { Field: 'Is Group Lead', Description: 'TRUE if this is the first question in a group', Example: 'TRUE' },
      { Field: 'Requires Evidence', Description: 'TRUE if question requires file upload', Example: 'FALSE' },
      { Field: 'Evidence Description', Description: 'Description of what evidence is needed', Example: 'Upload carbon report' }
    ];

    const instructionsWorksheet = XLSX.utils.json_to_sheet(instructionsData);
    instructionsWorksheet['!cols'] = [
      { wch: 25 }, // Field
      { wch: 80 }, // Description
      { wch: 30 }  // Example
    ];
    
    XLSX.utils.book_append_sheet(workbook, instructionsWorksheet, 'Instructions');

    // Generate the Excel file buffer
    const buffer = XLSX.write(workbook, { 
      type: 'buffer', 
      bookType: 'xlsx',
      compression: true 
    });

    // Return the Excel file as a response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="questions_template.xlsx"'
      }
    });
  } catch (error) {
    console.error('Error generating Excel template:', error);
    return NextResponse.json(
      { error: 'Failed to generate Excel template' },
      { status: 500 }
    );
  }
}