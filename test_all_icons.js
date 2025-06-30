// Test all lucide-react imports used in the project

// From LoadingStates
import { Loader2, RefreshCw, Brain, Sparkles } from "lucide-react";

console.log('=== LoadingStates icons ===');
console.log('Loader2:', typeof Loader2, Loader2);
console.log('RefreshCw:', typeof RefreshCw, RefreshCw);
console.log('Brain:', typeof Brain, Brain);
console.log('Sparkles:', typeof Sparkles, Sparkles);

// Check for undefined
const icons1 = { Loader2, RefreshCw, Brain, Sparkles };
Object.entries(icons1).forEach(([name, icon]) => {
  if (icon === undefined) {
    console.error(`❌ ${name} is undefined!`);
  } else {
    console.log(`✅ ${name} is OK`);
  }
});