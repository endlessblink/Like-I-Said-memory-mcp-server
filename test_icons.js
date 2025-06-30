// Test lucide-react icon imports
import { Edit, Trash2, Eye, Clock, Users, FileText, Loader2 } from "lucide-react";

console.log('Testing lucide-react imports:');
console.log('Edit:', typeof Edit, Edit);
console.log('Trash2:', typeof Trash2, Trash2);
console.log('Eye:', typeof Eye, Eye);
console.log('Clock:', typeof Clock, Clock);
console.log('Users:', typeof Users, Users);
console.log('FileText:', typeof FileText, FileText);
console.log('Loader2:', typeof Loader2, Loader2);

// Check for undefined imports
const icons = { Edit, Trash2, Eye, Clock, Users, FileText, Loader2 };
Object.entries(icons).forEach(([name, icon]) => {
  if (icon === undefined) {
    console.error(`❌ ${name} is undefined!`);
  } else {
    console.log(`✅ ${name} is OK`);
  }
});