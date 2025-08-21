'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Video, Phone, User, Clock, X, Mic, MicOff, VideoOff, Minimize2, Maximize2 } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { serviceRequestAPI } from '../../../lib/api';

export default function VideoConsultationPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode } = useTheme();

  // URL parameters
  const [requestId, setRequestId] = useState(null);
  const userType = searchParams.get('type'); // 'doctor' or 'patient'
  const roomUrl = searchParams.get('roomUrl');

  const [serviceRequest, setServiceRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callStarted, setCallStarted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [error, setError] = useState(null);
  const [isDetailsMinimized, setIsDetailsMinimized] = useState(false);

  // Handle async params
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setRequestId(resolvedParams.requestId);
    };
    
    getParams();
  }, [params]);

  useEffect(() => {
    if (!requestId || !userType) {
      if (requestId === null) return; // Still loading params
      setError('Missing required parameters');
      setLoading(false);
      return;
    }

    fetchServiceRequest();
  }, [requestId, userType, roomUrl]);

  const fetchServiceRequest = async () => {
    try {
      const response = await serviceRequestAPI.getById(requestId);
      
      if (response.data) {
        const request = response.data.data || response.data;
        setServiceRequest(request);
        
        // Validate that this is indeed an online consultation
        const isOnlineConsultation = request.serviceType?.toLowerCase().includes('online consultation') || 
                                      request.service?.category === 'online';
        
        if (!isOnlineConsultation) {
          setError('This is not an online consultation service request');
          return;
        }

        // If no roomUrl provided in URL params, use the one from the service request
        const currentRoomUrl = roomUrl || request.wherebyRoomUrl;
        
        if (!currentRoomUrl) {
          setError('No video call link available for this consultation');
          return;
        }

        // Check if consultation is scheduled for the right time (within 2 hour window)
        if (request.requestedServiceDateTime) {
          const scheduledTime = new Date(request.requestedServiceDateTime);
          const now = new Date();
          const timeDiff = Math.abs(now.getTime() - scheduledTime.getTime());
          const hoursDiff = timeDiff / (1000 * 60 * 60);
          
          if (hoursDiff > 2) {
            console.warn('Consultation is not within the scheduled time window');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching service request:', error);
      setError('Failed to load consultation details');
    } finally {
      setLoading(false);
    }
  };

  const handleCallStart = async () => {
    try {
      setCallStarted(true);
      
      // Update service request to mark video call as started
      await serviceRequestAPI.update(requestId, {
        videoCallStartedAt: new Date().toISOString(),
        status: 'in_progress'
      });
      
      ('Video call started');
    } catch (error) {
      console.error('Error updating call start status:', error);
    }
  };

  const handleCallEnd = async () => {
    try {
      setCallEnded(true);
      
      // Update service request to mark video call as ended
      await serviceRequestAPI.update(requestId, {
        videoCallEndedAt: new Date().toISOString()
      });
      
      ('Video call ended');
      
      // Redirect after a delay
      setTimeout(() => {
        if (userType === 'doctor') {
          router.push('/doctor/dashboard');
        } else {
          router.push('/');
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error updating call end status:', error);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Video className="h-12 w-12 text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Loading consultation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <X className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className={`text-lg mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (callEnded) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Phone className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <p className={`text-lg mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Consultation Ended</p>
          <p className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Thank you for using ThanksDoc</p>
          <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Redirecting you back...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-gray-700 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Video className="h-6 w-6 text-blue-400" />
            <div>
              <h1 className="text-lg font-semibold text-white">
                ThanksDoc - Online Consultation
              </h1>
              <p className="text-sm text-gray-400">
                {userType === 'doctor' ? (
                  `Patient: ${serviceRequest?.patientFirstName} ${serviceRequest?.patientLastName}`
                ) : (
                  `Doctor: Dr. ${serviceRequest?.doctor?.firstName} ${serviceRequest?.doctor?.lastName}`
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {serviceRequest?.requestedServiceDateTime && (
              <div className="flex items-center space-x-1 text-sm text-gray-400">
                <Clock className="h-4 w-4" />
                <span>
                  {new Date(serviceRequest.requestedServiceDateTime).toLocaleTimeString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative bg-gray-900">
        {/* Whereby Embed */}
        <div className="h-screen w-full relative bg-gray-900">
          {/* Custom CSS to hide Whereby branding */}
          <style jsx>{`
            iframe {
              border: none !important;
            }
            /* Hide Whereby logo and branding elements */
            .whereby-embed iframe {
              border: none;
            }
          `}</style>
          
          <iframe
            src={`${decodeURIComponent(roomUrl || serviceRequest?.wherebyRoomUrl)}?embed&displayName=${encodeURIComponent(
              userType === 'doctor' 
                ? `Dr. ${serviceRequest?.doctor?.firstName} ${serviceRequest?.doctor?.lastName}` 
                : `${serviceRequest?.patientFirstName} ${serviceRequest?.patientLastName}`
            )}&background=dark&floatSelf=off&people=off&leaveButton=on&screenshare=on&chat=on&logo=off`}
            className="w-full h-full border-0"
            title="ThanksDoc Video Consultation"
            allow="camera; microphone; fullscreen; speaker; display-capture"
            allowFullScreen
            onLoad={handleCallStart}
          />

          {/* ThanksDoc Branding Overlay */}
          <div className="absolute top-4 left-4 z-10">
            <div className="flex items-center space-x-2 px-3 py-2 rounded-lg backdrop-blur-sm bg-gray-900/80 text-white shadow-lg">
              <Video className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-sm">ThanksDoc</span>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className={`absolute top-4 right-4 bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg transition-all duration-300 ${
          isDetailsMinimized ? 'w-12 h-12' : 'p-4 max-w-sm'
        }`}>
          {isDetailsMinimized ? (
            // Minimized state - just the toggle button
            <button
              onClick={() => setIsDetailsMinimized(false)}
              className="w-full h-full flex items-center justify-center text-blue-400 hover:text-blue-300 transition-colors"
              title="Show consultation details"
            >
              <Maximize2 className="h-5 w-5" />
            </button>
          ) : (
            // Expanded state - full details
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-blue-400" />
                  <h3 className="font-medium text-white">
                    Consultation Details
                  </h3>
                </div>
                <button
                  onClick={() => setIsDetailsMinimized(true)}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                  title="Minimize consultation details"
                >
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>
              
              <div className="space-y-2 text-sm text-gray-300">
                <div>
                  <span className="font-medium">Service:</span> {serviceRequest?.serviceType}
                </div>
                
                {userType === 'doctor' && (
                  <div>
                    <span className="font-medium">Patient:</span> {serviceRequest?.patientFirstName} {serviceRequest?.patientLastName}
                  </div>
                )}
                
                {userType === 'patient' && serviceRequest?.doctor && (
                  <div>
                    <span className="font-medium">Doctor:</span> Dr. {serviceRequest.doctor.firstName} {serviceRequest.doctor.lastName}
                  </div>
                )}
                
                <div>
                  <span className="font-medium">Duration:</span> {serviceRequest?.estimatedDuration || 20} minute(s)
                </div>
                
                {serviceRequest?.requestedServiceDateTime && (
                  <div>
                    <span className="font-medium">Scheduled:</span>{' '}
                    {new Date(serviceRequest.requestedServiceDateTime).toLocaleString('en-GB')}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
