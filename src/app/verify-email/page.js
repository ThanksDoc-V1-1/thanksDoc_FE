'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyEmailContent() {
  const [status, setStatus] = useState('verifying'); // verifying, success, error, expired, already_verified
  const [message, setMessage] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [loading, setLoading] = useState(false); // Add loading state for verification checks
  const [userEmail, setUserEmail] = useState(''); // Store user email for resending
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const token = searchParams.get('token');
  const type = searchParams.get('type');
  const email = searchParams.get('email'); // Try to get email from URL if available

  useEffect(() => {
    if (token && type) {
      verifyEmail(token, type);
    } else {
      setStatus('error');
      setMessage('Invalid verification link. Please check your email for the correct link.');
    }
    
    // Set user email if available in URL parameters
    if (email) {
      setUserEmail(email);
    }
  }, [token, type, email]);

  const verifyEmail = async (verificationToken, userType) => {
    try {
      // Try to decode token to extract email if possible (basic JWT decode without verification)
      try {
        const tokenParts = verificationToken.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('🔍 Token payload:', payload);
          if (payload.email) {
            setUserEmail(payload.email);
          }
        }
      } catch (tokenError) {
        console.log('Could not decode token for email extraction:', tokenError);
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: verificationToken,
          type: userType
        }),
      });

      const data = await response.json();
      console.log('🔍 Verification response:', { status: response.status, data });

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        
        // Store user email for potential resending
        if (data.user?.email) {
          setUserEmail(data.user.email);
        }
        
        // Store JWT token if provided
        if (data.jwt) {
          localStorage.setItem('token', data.jwt);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        
        // Add a small delay to ensure localStorage is properly set before redirect
        setTimeout(() => {
          try {
            // Redirect to dashboard after successful verification
            router.push(`/${userType}/dashboard`);
          } catch (redirectError) {
            console.error('Error during redirect:', redirectError);
            setStatus('error');
            setMessage('Verification successful but there was an issue redirecting. Please try logging in manually.');
          }
        }, 500);
      } else {
        // Enhanced error handling for different scenarios
        const errorMessage = data.message || data.error?.message || 'Email verification failed';
        console.log('🚫 Verification failed:', { status: response.status, errorMessage, fullData: data });
        
        // Check if email is already verified - enhanced detection
        if (response.status === 409 || 
            response.status === 400 && (
              errorMessage.toLowerCase().includes('already verified') || 
              errorMessage.toLowerCase().includes('already confirmed') ||
              errorMessage.toLowerCase().includes('email is already verified') ||
              errorMessage.toLowerCase().includes('user is already verified') ||
              errorMessage.toLowerCase().includes('verification already completed') ||
              data.error === 'EMAIL_ALREADY_VERIFIED' ||
              data.code === 'EMAIL_ALREADY_VERIFIED'
            )) {
          console.log('✅ Detected already verified email');
          setStatus('already_verified');
          setMessage('Your email has already been verified. You can now proceed to login.');
        } else if (response.status === 401 || response.status === 404 || 
                   errorMessage.toLowerCase().includes('expired') || 
                   errorMessage.toLowerCase().includes('invalid token') ||
                   errorMessage.toLowerCase().includes('token not found') ||
                   errorMessage.toLowerCase().includes('token has expired')) {
          console.log('⏰ Detected expired/invalid token - checking if already verified');
          
          // For expired/invalid tokens, check if the user might already be verified
          let emailToCheck = userEmail;
          
          // If we don't have email from token, try to get it from URL or prompt user
          if (!emailToCheck) {
            console.log('📧 No email available, attempting to get from URL or user');
            emailToCheck = searchParams.get('email') || email; // Try URL parameters
          }
          
          if (emailToCheck) {
            console.log('🔍 Checking if email is already verified:', emailToCheck);
            // Try to check verification status first
            const isAlreadyVerified = await checkUserVerificationStatus(emailToCheck, userType);
            if (isAlreadyVerified) {
              setStatus('already_verified');
              setMessage('Your email has already been verified. You can now proceed to login.');
              return; // Exit early, don't set expired status
            }
          } else {
            // If we can't get the email, show a more helpful message
            console.log('❓ Cannot determine email - showing helpful expired message');
            setStatus('expired');
            setMessage('This verification link has expired. If you believe your email is already verified, please try logging in directly.');
            return;
          }
          
          // If not already verified or can't check, treat as expired
          setStatus('expired');
          setMessage('This verification link has expired or is invalid. Please request a new verification email.');
        } else {
          console.log('❌ Other verification error');
          setStatus('error');
          setMessage(errorMessage);
          
          // As a last resort, if we have the user's email, try to check their verification status
          if (userEmail && errorMessage.toLowerCase().includes('verification') && !errorMessage.toLowerCase().includes('expired')) {
            console.log('🔍 Attempting to check verification status for email:', userEmail);
            const isAlreadyVerified = await checkUserVerificationStatus(userEmail, userType);
            if (isAlreadyVerified) {
              setStatus('already_verified');
              setMessage('Your email has already been verified. You can now proceed to login.');
            }
          }
        }
        
        // Try to extract email from error response if available
        if (data.user?.email || data.email) {
          setUserEmail(data.user?.email || data.email);
        }
      }
    } catch (error) {
      console.error('Email verification error:', error);
      
      // Check if it's a network error vs API error
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setStatus('error');
        setMessage('Network error. Please check your internet connection and try again.');
      } else if (error.response) {
        // If there's a response, try to extract meaningful error info
        console.log('🔍 Error response:', error.response);
        const errorData = error.response.data || {};
        const errorMessage = errorData.message || errorData.error?.message || 'Email verification failed';
        
        // Apply same logic for already verified detection
        if (error.response.status === 409 || 
            errorMessage.toLowerCase().includes('already verified')) {
          setStatus('already_verified');
          setMessage('Your email has already been verified. You can now proceed to login.');
        } else {
          setStatus('error');
          setMessage(errorMessage);
        }
      } else {
        setStatus('error');
        setMessage('An error occurred during email verification. Please try again.');
      }
    }
  };

  // Helper function to check if a user is already verified
  const checkUserVerificationStatus = async (email, userType) => {
    try {
      console.log('🔍 Checking verification status for:', email, 'type:', userType);
      
      // Map user types to API endpoints
      const endpointMap = {
        'doctor': 'doctors',
        'business': 'businesses'
      };
      
      const endpoint = endpointMap[userType];
      if (!endpoint) {
        console.log('❌ Unknown user type:', userType);
        return null;
      }
      
      console.log('🔍 Querying endpoint:', `${process.env.NEXT_PUBLIC_API_URL}/${endpoint}`);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/${endpoint}?filters[email][$eq]=${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ User query result:', data);
        
        if (data.data && data.data.length > 0) {
          const user = data.data[0];
          // Check if email is verified
          return user.isEmailVerified === true;
        } else {
          console.log('❌ No user found with email:', email);
          return false;
        }
      } else {
        console.log('❌ API error:', response.status);
        return null;
      }
    } catch (error) {
      console.log('❌ Error checking verification status:', error);
      return null;
    }
  };

  // Function to handle manual verification check
  const handleCheckVerificationStatus = async () => {
    // Prompt user for email
    const email = window.prompt('Please enter your email address to check verification status:');
    
    if (!email || email.trim() === '') {
      alert('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    
    try {
      console.log('🔍 Checking verification status for manually entered email:', email.trim());
      
      // Check both doctor and business collections since we don't know the user type
      const userTypes = [
        { type: 'doctor', endpoint: 'doctors' },
        { type: 'business', endpoint: 'businesses' }
      ];
      
      let userFound = false;
      let isVerified = false;
      let foundUserType = '';
      
      for (const { type, endpoint } of userTypes) {
        try {
          console.log(`🔍 Checking ${type} collection...`);
          
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/${endpoint}?filters[email][$eq]=${encodeURIComponent(email.trim())}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log(`📊 ${type} data:`, userData);
            
            if (userData.data && userData.data.length > 0) {
              const user = userData.data[0];
              userFound = true;
              foundUserType = type;
              
              // Check if email is verified
              if (user.isEmailVerified === true) {
                isVerified = true;
                console.log(`✅ Found verified ${type}:`, user.email);
                break;
              } else {
                console.log(`❌ Found unverified ${type}:`, user.email);
                break; // Found user but not verified, no need to check other types
              }
            }
          } else {
            console.log(`❌ Error checking ${type}:`, response.status);
          }
        } catch (error) {
          console.log(`❌ Error checking ${type}:`, error);
        }
      }
      
      if (userFound) {
        if (isVerified) {
          setStatus('already_verified');
          setMessage(`Great! Your email is already verified as a ${foundUserType}. You can proceed to login.`);
          // Update the type so the login button works correctly
          if (foundUserType && !type) {
            // If we found the user type but didn't have it before, we can use it
            window.history.replaceState({}, '', `${window.location.pathname}?type=${foundUserType}`);
          }
        } else {
          alert(`Your email is registered as a ${foundUserType} but not yet verified. Please use the "Get New Verification Link" button above.`);
        }
      } else {
        alert('No account found with this email address. Please make sure you entered the correct email or create a new account.');
      }
      
    } catch (error) {
      console.log('❌ Error during verification check:', error);
      alert('Unable to check verification status. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!type) {
      setMessage('User type not specified. Please use the link from your email.');
      return;
    }

    let emailToUse = userEmail;
    
    // If we don't have the email stored, ask the user for it
    if (!emailToUse) {
      emailToUse = prompt('Please enter your email address:');
      if (!emailToUse) return;
    }

    setIsResending(true);
    try {
      console.log('🔄 Attempting to resend verification email for:', emailToUse, 'type:', type);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailToUse,
          type: type
        }),
      });

      const data = await response.json();
      console.log('📡 Resend response:', response.status, data);

      if (response.ok) {
        setMessage('Verification email sent! Please check your email and click the new verification link.');
        setStatus('success');
      } else {
        console.log('❌ Resend failed with:', data.message || data.error);
        setMessage(data.message || data.error || 'Failed to resend verification email');
        
        // If user not found or already verified, suggest checking verification status
        if (data.message && data.message.includes('already verified')) {
          const checkVerification = confirm('It seems your email might already be verified. Would you like to check your verification status?');
          if (checkVerification) {
            handleCheckVerificationStatus();
          }
        }
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setMessage('An error occurred while resending verification email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">TD</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Email Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {status === 'verifying' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Verifying your email address...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Email Verified!</h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              <p className="mt-4 text-sm text-blue-700 font-medium">Redirecting to your dashboard...</p>
            </div>
          )}

          {status === 'already_verified' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Email Already Verified</h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              
              <div className="mt-6">
                <button
                  onClick={() => router.push(`/${type}/login`)}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Proceed to Login
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Verification Failed</h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              
              {/* Only show resend button if it's not an invalid link error */}
              {!message.toLowerCase().includes('invalid verification link') && !message.toLowerCase().includes('check your email for the correct link') && (
                <div className="mt-6">
                  <button
                    onClick={resendVerificationEmail}
                    disabled={isResending}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isResending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                  {userEmail && (
                    <p className="mt-2 text-xs text-gray-500">
                      Sending to: {userEmail}
                    </p>
                  )}
                </div>
              )}
              
              {/* Show manual login option for invalid link errors */}
              {(message.toLowerCase().includes('invalid verification link') || message.toLowerCase().includes('check your email for the correct link')) && (
                <div className="mt-6">
                  <button
                    onClick={() => router.push(`/${type}/login`)}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Try Login Instead
                  </button>
                </div>
              )}
            </div>
          )}

          {status === 'expired' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Link Expired</h3>
              <p className="mt-2 text-sm text-gray-600">{message}</p>
              
              <div className="mt-6 space-y-3">
                <button
                  onClick={resendVerificationEmail}
                  disabled={isResending}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isResending ? 'Sending...' : 'Get New Verification Link'}
                </button>
                
                <button
                  onClick={handleCheckVerificationStatus}
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Checking...' : 'Check if Already Verified'}
                </button>
                
                {userEmail && (
                  <p className="mt-2 text-xs text-gray-500">
                    Checking/Sending to: {userEmail}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => router.push('/')}
              className="w-full text-center text-sm text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-xl">TD</span>
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Email Verification
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading verification page...</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
