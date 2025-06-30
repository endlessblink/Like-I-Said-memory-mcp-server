import { FileText } from "lucide-react";

const contentTypeIcons = {
  text: FileText,
  code: FileText, // TODO: Add code icon
  structured: FileText // TODO: Add structured data icon
}

// Fallback icon function
const getContentIcon = (contentType) => {
  console.log('getContentIcon called with:', contentType);
  console.log('FileText:', FileText);
  
  if (!contentType) {
    console.log('No contentType, returning FileText');
    return FileText;
  }
  
  const Icon = contentTypeIcons[contentType];
  console.log('Icon lookup result:', Icon);
  console.log('Final return:', Icon || FileText);
  
  return Icon || FileText; // Always return a valid icon
}

// Test cases
console.log('=== Testing getContentIcon ===');
console.log('Test 1 - undefined:', getContentIcon(undefined));
console.log('Test 2 - null:', getContentIcon(null));
console.log('Test 3 - empty string:', getContentIcon(''));
console.log('Test 4 - text:', getContentIcon('text'));
console.log('Test 5 - unknown:', getContentIcon('unknown'));

// Test the actual component usage
console.log('\n=== Testing ContentIcon component ===');
const ContentIcon1 = getContentIcon('text');
const ContentIcon2 = getContentIcon(undefined);
const ContentIcon3 = getContentIcon('unknown');

console.log('ContentIcon1 (text):', typeof ContentIcon1, ContentIcon1);
console.log('ContentIcon2 (undefined):', typeof ContentIcon2, ContentIcon2);
console.log('ContentIcon3 (unknown):', typeof ContentIcon3, ContentIcon3);