'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Video, Phone, User, Clock, X } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';
import { serviceRequestAPI } from '../../../lib/api';

export default function VideoConsultationPage({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isDarkMode } = useTheme();

  // URL parameters
  const requestId = params?.requestId || searchParams.get('requestId');
  const userType = searchParams.get('type'); // 'doctor' or 'patient'
  const roomUrl = searchParams.get('roomUrl');

  const [serviceRequest, setServiceRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [callStarted, setCallStarted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!requestId || !userType || !roomUrl) {
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
      
      console.log('Video call started');
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
      
      console.log('Video call ended');
      
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
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-4 py-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Video className={`h-6 w-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <div>
              <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ThanksDoc - Online Consultation
              </h1>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
              <div className={`flex items-center space-x-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
      <div className="flex-1 relative">
        {/* Whereby Embed */}
        <div className="h-screen w-full relative">
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
            )}&background=off&floatSelf=off&people=off&leaveButton=off&screenshare=on&chat=on&logo=off`}
            className="w-full h-full border-0"
            title="ThanksDoc Video Consultation"
            allow="camera; microphone; fullscreen; speaker; display-capture"
            allowFullScreen
            onLoad={handleCallStart}
          />

          {/* ThanksDoc Branding Overlay */}
          <div className="absolute top-4 left-4 z-10">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg backdrop-blur-sm ${
              isDarkMode ? 'bg-gray-900/80 text-white' : 'bg-white/80 text-gray-900'
            } shadow-lg`}>
              <Video className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-sm">ThanksDoc</span>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className={`absolute top-4 right-4 ${isDarkMode ? 'bg-gray-800/90' : 'bg-white/90'} backdrop-blur-sm rounded-lg shadow-lg p-4 max-w-sm`}>
          <div className="flex items-center space-x-3 mb-3">
            <User className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Consultation Details
            </h3>
          </div>
          
          <div className={`space-y-2 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            <div>
              <span className="font-medium">Service:</span> {serviceRequest?.serviceType}
            </div>
            
            {userType === 'doctor' && (
              <>
                <div>
                  <span className="font-medium">Patient:</span> {serviceRequest?.patientFirstName} {serviceRequest?.patientLastName}
                </div>
                {serviceRequest?.patientEmail && (
                  <div>
                    <span className="font-medium">Email:</span> {serviceRequest?.patientEmail}
                  </div>
                )}
              </>
            )}
            
            {userType === 'patient' && serviceRequest?.doctor && (
              <div>
                <span className="font-medium">Doctor:</span> Dr. {serviceRequest.doctor.firstName} {serviceRequest.doctor.lastName}
              </div>
            )}
            
            <div>
              <span className="font-medium">Duration:</span> {serviceRequest?.estimatedDuration || 1} hour(s)
            </div>
            
            {serviceRequest?.requestedServiceDateTime && (
              <div>
                <span className="font-medium">Scheduled:</span>{' '}
                {new Date(serviceRequest.requestedServiceDateTime).toLocaleString('en-GB')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
