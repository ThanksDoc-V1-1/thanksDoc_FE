'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronDown, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

export default function ReferenceFormPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token;
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [referenceData, setReferenceData] = useState(null);
  
  const [formData, setFormData] = useState({
    clinicianName: '',
    clinicianPosition: '',
    clinicianEmail: '',
    refereeName: '',
    refereePosition: '',
    refereeWorkPlace: '',
    workDuration: '',
    refereeEmail: '',
    clinicalKnowledge: '',
    diagnosis: '',
    clinicalDecisionMaking: '',
    treatment: ''
  });

  const clinicalSkillOptions = [
    'Poor',
    'Less than satisfactory',
    'Satisfactory', 
    'Good',
    'Very good',
    'N/A'
  ];

  useEffect(() => {
    if (token) {
      loadReferenceData();
    }
  }, [token]);

  const loadReferenceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professional-reference-submissions/token/${token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Reference form not found or invalid token');
        } else {
          setError('Failed to load reference form');
        }
        return;
      }

      const result = await response.json();
      if (result.success) {
        setReferenceData(result.data);
        
        // Check if already submitted
        if (result.data.submission.isSubmitted) {
          setSubmitted(true);
        } else {
          // Pre-fill some fields from the original reference
          const reference = result.data.reference;
          const doctor = result.data.doctor;
          
          setFormData(prev => ({
            ...prev,
            // Doctor information (read-only)
            clinicianName: `${doctor.firstName} ${doctor.lastName}`,
            clinicianPosition: 'General Practitioner',
            clinicianEmail: doctor.email,
            // Referee information (editable)
            refereeName: `${reference.firstName} ${reference.lastName}`,
            refereeEmail: reference.email,
            refereePosition: reference.position,
            refereeWorkPlace: reference.organisation
          }));
        }
      }
    } catch (error) {
      console.error('Error loading reference data:', error);
      setError('Failed to load reference form');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const requiredFields = [
      'clinicianName', 'clinicianPosition', 'clinicianEmail',
      'refereeName', 'refereePosition', 'refereeWorkPlace',
      'workDuration', 'refereeEmail', 'clinicalKnowledge',
      'diagnosis', 'clinicalDecisionMaking', 'treatment'
    ];

    const emptyFields = requiredFields.filter(field => !formData[field]);
    if (emptyFields.length > 0) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/professional-reference-submissions/token/${token}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to submit reference form');
      }

      const result = await response.json();
      if (result.success) {
        setSubmitted(true);
      } else {
        setError('Failed to submit reference form');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setError('Failed to submit reference form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading reference form...</p>
        </div>
      </div>
    );
  }

  if (error && !referenceData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Form Not Found</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact the person who sent you this link.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Reference Submitted</h1>
          <p className="text-gray-600 mb-4">
            Thank you for completing the professional reference form. Your response has been submitted successfully.
          </p>
          <p className="text-sm text-gray-500">
            You can now close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Professional Reference Form</h1>
            <p className="text-sm text-gray-600 mt-1">
              Reference request for Dr. {referenceData?.doctor?.firstName} {referenceData?.doctor?.lastName}
            </p>
          </div>
          
          <div className="px-6 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-900 mb-2">GMC Guidelines</h3>
              <p className="text-sm text-blue-700">
                This form provides a tool for writing a reference letter required to work via the ThankDoc platform. 
                Please follow the GMC Good Medical Practice guideline about writing references that can be accessed on{' '}
                <a 
                  href="https://www.gmc-uk.org/ethical-guidance/ethical-guidance-for-doctors/writing-references/writing-references"
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="underline hover:text-blue-600"
                >
                  https://www.gmc-uk.org/ethical-guidance/ethical-guidance-for-doctors/writing-references/writing-references
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-6 space-y-8">
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Doctor Information */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="bg-blue-100 rounded-full p-2 mr-3">
                    <span className="text-blue-600 font-bold text-sm">1</span>
                  </div>
                  Doctor Information (Person being referenced)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="clinicianName" className="block text-sm font-semibold text-gray-800 mb-2">
                      Doctor's Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="clinicianName"
                      name="clinicianName"
                      value={formData.clinicianName}
                      onChange={handleInputChange}
                      required
                      readOnly
                      placeholder={referenceData?.doctor?.firstName + ' ' + referenceData?.doctor?.lastName}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-100 placeholder-gray-500 cursor-not-allowed"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="clinicianPosition" className="block text-sm font-semibold text-gray-800 mb-2">
                      Doctor's Position <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="clinicianPosition"
                      name="clinicianPosition"
                      value="General Practitioner"
                      onChange={handleInputChange}
                      required
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-100 placeholder-gray-500 cursor-not-allowed"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label htmlFor="clinicianEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Doctor's Email address *
                    </label>
                    <input
                      type="email"
                      id="clinicianEmail"
                      name="clinicianEmail"
                      value={formData.clinicianEmail}
                      onChange={handleInputChange}
                      required
                      readOnly
                      placeholder={referenceData?.doctor?.email}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-gray-100 placeholder-gray-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Referee Information */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="bg-green-100 rounded-full p-2 mr-3">
                    <span className="text-green-600 font-bold text-sm">2</span>
                  </div>
                  Referee Information (Person providing reference)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="refereeName" className="block text-sm font-medium text-gray-700 mb-1">
                      Referee's Name *
                    </label>
                    <input
                      type="text"
                      id="refereeName"
                      name="refereeName"
                      value={formData.refereeName}
                      onChange={handleInputChange}
                      required
                      placeholder={referenceData?.reference?.firstName + ' ' + referenceData?.reference?.lastName}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="refereePosition" className="block text-sm font-medium text-gray-700 mb-1">
                      Referee's Position *
                    </label>
                    <input
                      type="text"
                      id="refereePosition"
                      name="refereePosition"
                      value={formData.refereePosition}
                      onChange={handleInputChange}
                      required
                      placeholder={referenceData?.reference?.position}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="refereeWorkPlace" className="block text-sm font-medium text-gray-700 mb-1">
                      Referee's Work Place *
                    </label>
                    <input
                      type="text"
                      id="refereeWorkPlace"
                      name="refereeWorkPlace"
                      value={formData.refereeWorkPlace}
                      onChange={handleInputChange}
                      required
                      placeholder={referenceData?.reference?.organisation}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="workDuration" className="block text-sm font-medium text-gray-700 mb-1">
                      How long you worked with them *
                    </label>
                    <input
                      type="text"
                      id="workDuration"
                      name="workDuration"
                      value={formData.workDuration}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g., 2 years, 6 months"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label htmlFor="refereeEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Referee's Email address *
                    </label>
                    <input
                      type="email"
                      id="refereeEmail"
                      name="refereeEmail"
                      value={formData.refereeEmail}
                      onChange={handleInputChange}
                      required
                      placeholder={referenceData?.reference?.email}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-500"
                    />
                  </div>
                </div>
              </div>

              {/* Clinical Skills Assessment */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="bg-purple-100 rounded-full p-2 mr-3">
                    <span className="text-purple-600 font-bold text-sm">3</span>
                  </div>
                  Clinical Skills Assessment
                </h2>
                <div className="space-y-6">
                  
                  {/* Clinical Knowledge */}
                  <div>
                    <label htmlFor="clinicalKnowledge" className="block text-sm font-medium text-gray-700 mb-1">
                      Clinical knowledge *
                    </label>
                    <div className="relative">
                      <select
                        id="clinicalKnowledge"
                        name="clinicalKnowledge"
                        value={formData.clinicalKnowledge}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none text-gray-900 bg-white"
                      >
                        <option value="" className="text-gray-500">Select rating</option>
                        {clinicalSkillOptions.map((option) => (
                          <option key={option} value={option} className="text-gray-900">{option}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Diagnosis */}
                  <div>
                    <label htmlFor="diagnosis" className="block text-sm font-medium text-gray-700 mb-1">
                      Diagnosis *
                    </label>
                    <div className="relative">
                      <select
                        id="diagnosis"
                        name="diagnosis"
                        value={formData.diagnosis}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none text-gray-900 bg-white"
                      >
                        <option value="" className="text-gray-500">Select rating</option>
                        {clinicalSkillOptions.map((option) => (
                          <option key={option} value={option} className="text-gray-900">{option}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Clinical Decision Making */}
                  <div>
                    <label htmlFor="clinicalDecisionMaking" className="block text-sm font-medium text-gray-700 mb-1">
                      Clinical decision making *
                    </label>
                    <div className="relative">
                      <select
                        id="clinicalDecisionMaking"
                        name="clinicalDecisionMaking"
                        value={formData.clinicalDecisionMaking}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none text-gray-900 bg-white"
                      >
                        <option value="" className="text-gray-500">Select rating</option>
                        {clinicalSkillOptions.map((option) => (
                          <option key={option} value={option} className="text-gray-900">{option}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Treatment */}
                  <div>
                    <label htmlFor="treatment" className="block text-sm font-medium text-gray-700 mb-1">
                      Treatment *
                    </label>
                    <div className="relative">
                      <select
                        id="treatment"
                        name="treatment"
                        value={formData.treatment}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none text-gray-900 bg-white"
                      >
                        <option value="" className="text-gray-500">Select rating</option>
                        {clinicalSkillOptions.map((option) => (
                          <option key={option} value={option} className="text-gray-900">{option}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="px-6 py-6 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  All fields marked with * are required
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-8 py-3 rounded-lg text-white font-medium transition-colors duration-200 ${
                    submitting 
                      ? 'bg-blue-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700 focus:bg-blue-700'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm`}
                >
                  {submitting ? (
                    <span className="flex items-center">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Submitting Reference...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Submit Reference
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
