import Link from "next/link";
import { ArrowRight, Stethoscope, Building2, Clock, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Stethoscope className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">ThanksDoc</span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/admin/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Admin Dashboard
            </Link>
            <Link href="/doctor/dashboard" className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              Doctor Dashboard
            </Link>
            <Link href="/business/dashboard" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
              Business Dashboard
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            On-Demand <span className="text-blue-600 dark:text-blue-400">Healthcare</span>
            <br />
            for Your Business
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Connect pharmacies and businesses with verified doctors instantly. 
            Request medical consultations within 10km radius with just a few clicks.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link 
              href="/business/register" 
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Building2 className="h-5 w-5" />
              <span>Register Your Business</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link 
              href="/doctor/register" 
              className="border border-blue-600 text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Stethoscope className="h-5 w-5" />
              <span>Join as Doctor</span>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Quick Response</h3>
              <p className="text-gray-600 dark:text-gray-300">Get connected with nearby doctors in minutes, not hours.</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Verified Doctors</h3>
              <p className="text-gray-600 dark:text-gray-300">All doctors are vetted and verified by our admin team.</p>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
              <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">B2B Focused</h3>
              <p className="text-gray-600 dark:text-gray-300">Designed specifically for pharmacies and healthcare businesses.</p>
            </div>
          </div>

          {/* How it Works */}
          <div className="mt-20">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12">How ThanksDoc Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Request a Doctor</h3>
                <p className="text-gray-600 dark:text-gray-300">Business submits a request with urgency level and service type</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Doctor Responds</h3>
                <p className="text-gray-600 dark:text-gray-300">Nearby doctors receive notification and first responder gets the job</p>
              </div>
              <div className="text-center">
                <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Service Delivered</h3>
                <p className="text-gray-600 dark:text-gray-300">Doctor visits location, provides service, and payment is processed</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Stethoscope className="h-6 w-6" />
            <span className="text-xl font-bold">ThanksDoc</span>
          </div>
          <p className="text-gray-400">Connecting healthcare professionals with businesses in need.</p>
        </div>
      </footer>
    </div>
  );
}
