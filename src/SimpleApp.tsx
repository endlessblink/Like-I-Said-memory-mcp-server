export default function App() {
  return (
    <div className="p-8 min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold text-green-600 mb-4">React is Working!</h1>
      <button 
        onClick={() => alert('Test successful')} 
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Test Button
      </button>
    </div>
  );
}