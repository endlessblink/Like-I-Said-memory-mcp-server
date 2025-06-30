// Test all lucide-react imports comprehensively

// From ExportImport
import { Download, Upload, FileText, FileSpreadsheet, File, AlertCircle, CheckCircle } from "lucide-react";

// From SortControls  
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

// From LoadingStates
import { Loader2, RefreshCw, Brain, Sparkles } from "lucide-react";

console.log('=== Comprehensive Icon Test ===');

const allIcons = { 
  Download, Upload, FileText, FileSpreadsheet, File, AlertCircle, CheckCircle,
  ArrowUpDown, ArrowUp, ArrowDown,
  Loader2, RefreshCw, Brain, Sparkles
};

console.log('Testing all icons used in the project...');

Object.entries(allIcons).forEach(([name, icon]) => {
  if (icon === undefined) {
    console.error(`❌ ${name} is undefined!`);
  } else {
    console.log(`✅ ${name} is OK (${icon.render?.displayName || 'unknown'})`);
  }
});

console.log('\n=== Summary ===');
const undefinedIcons = Object.entries(allIcons).filter(([name, icon]) => icon === undefined);
if (undefinedIcons.length > 0) {
  console.error(`Found ${undefinedIcons.length} undefined icons:`, undefinedIcons.map(([name]) => name));
} else {
  console.log('All icons are properly imported!')
}