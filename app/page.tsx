import Navigation from '@/components/Navigation';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to RememberMe
          </h1>
          <p className="text-xl text-gray-700 mb-8">
            Your helpful companion for remembering people and conversations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          <Link
            href="/camera"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">📷</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Camera
              </h2>
              <p className="text-gray-600">
                Recognize people and start conversations
              </p>
            </div>
          </Link>

          <Link
            href="/database"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">👥</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                People Database
              </h2>
              <p className="text-gray-600">
                Add and manage people in your life
              </p>
            </div>
          </Link>

          <Link
            href="/settings"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">⚙️</div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Settings
              </h2>
              <p className="text-gray-600">
                Customize your experience
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-12 bg-blue-50 border-l-4 border-primary-500 p-6 rounded">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            How to Use
          </h3>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Add people to your database with their photos and information</li>
            <li>Use the camera to recognize people when you see them</li>
            <li>View conversation history and key facts about each person</li>
            <li>Adjust settings for large text and high contrast if needed</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

