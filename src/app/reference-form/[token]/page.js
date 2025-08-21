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
    clinicianPosition: 'General Practitioner',
    clinicianEmail: '',
    refereeName: '',
    refereePosition: '',
    refereeWorkPlace: '',
    workDuration: '',
    refereeEmail: '',
    // Additional clinical competencies
    prescribing: '',
    medicalRecordKeeping: '',
    recognisingLimitations: '',
    keepingKnowledgeUpToDate: '',
    reviewingPerformance: '',
    teachingStudents: '',
    supervisingColleagues: '',
    commitmentToCare: '',
    communicationWithPatients: '',
    workingEffectivelyWithColleagues: '',
    effectiveTimeManagement: '',
    // Clinical statements
    respectsPatientConfidentiality: '',
    honestAndTrustworthy: '',
    performanceNotImpaired: '',
    // Fitness to practice
    fitToPractice: '',
    lastWorkedWith: ''
  });

  const clinicalSkillOptions = [
    'Poor',
    'Less than satisfactory',
    'Satisfactory', 
    'Good',
    'Very good',
    'N/A'
  ];

  const clinicalStatementOptions = [
    'Strongly disagree',
    'Disagree',
    'Agree',
    'Strongly agree',
    'N/A'
  ];

  const fitnessOptions = [
    'Yes',
    'No'
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
    
    ('Form submission started');
    ('Form data:', formData);
    
    // Validate required fields
    const requiredFields = [
      'clinicianName', 'clinicianPosition', 'clinicianEmail',
      'refereeName', 'refereePosition', 'refereeWorkPlace',
      'workDuration', 'refereeEmail',
      'prescribing', 'medicalRecordKeeping', 'recognisingLimitations',
      'keepingKnowledgeUpToDate', 'reviewingPerformance', 'teachingStudents',
      'supervisingColleagues', 'commitmentToCare', 'communicationWithPatients',
      'workingEffectivelyWithColleagues', 'effectiveTimeManagement',
      'respectsPatientConfidentiality', 'honestAndTrustworthy', 'performanceNotImpaired',
      'fitToPractice', 'lastWorkedWith'
    ];

    const emptyFields = requiredFields.filter(field => !formData[field]);
    ('Empty fields:', emptyFields);
    
    if (emptyFields.length > 0) {
      setError('Please fill in all required fields: ' + emptyFields.join(', '));
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
                  
                  {/* Prescribing */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-center font-medium text-gray-800 mb-4">Prescribing</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                      {clinicalSkillOptions.map((option) => (
                        <label key={option} className="flex items-center">
                          <input
                            type="radio"
                            name="prescribing"
                            value={option}
                            checked={formData.prescribing === option}
                            onChange={handleInputChange}
                            className="mr-2 text-blue-600"
                            required
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Medical record keeping */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-center font-medium text-gray-800 mb-4">Medical record keeping</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                      {clinicalSkillOptions.map((option) => (
                        <label key={option} className="flex items-center">
                          <input
                            type="radio"
                            name="medicalRecordKeeping"
                            value={option}
                            checked={formData.medicalRecordKeeping === option}
                            onChange={handleInputChange}
                            className="mr-2 text-blue-600"
                            required
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Recognising and working within limitations */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-center font-medium text-gray-800 mb-4">Recognising and working within limitations</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                      {clinicalSkillOptions.map((option) => (
                        <label key={option} className="flex items-center">
                          <input
                            type="radio"
                            name="recognisingLimitations"
                            value={option}
                            checked={formData.recognisingLimitations === option}
                            onChange={handleInputChange}
                            className="mr-2 text-blue-600"
                            required
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Keeping knowledge and skills up to date */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-center font-medium text-gray-800 mb-4">Keeping knowledge and skills up to date</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                      {clinicalSkillOptions.map((option) => (
                        <label key={option} className="flex items-center">
                          <input
                            type="radio"
                            name="keepingKnowledgeUpToDate"
                            value={option}
                            checked={formData.keepingKnowledgeUpToDate === option}
                            onChange={handleInputChange}
                            className="mr-2 text-blue-600"
                            required
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Reviewing and reflecting on own performance */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-center font-medium text-gray-800 mb-4">Reviewing and reflecting on own performance</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                      {clinicalSkillOptions.map((option) => (
                        <label key={option} className="flex items-center">
                          <input
                            type="radio"
                            name="reviewingPerformance"
                            value={option}
                            checked={formData.reviewingPerformance === option}
                            onChange={handleInputChange}
                            className="mr-2 text-blue-600"
                            required
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Teaching (students, trainees, others) */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-center font-medium text-gray-800 mb-4">Teaching (students, trainees, others)</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                      {clinicalSkillOptions.map((option) => (
                        <label key={option} className="flex items-center">
                          <input
                            type="radio"
                            name="teachingStudents"
                            value={option}
                            checked={formData.teachingStudents === option}
                            onChange={handleInputChange}
                            className="mr-2 text-blue-600"
                            required
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Supervising colleagues */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-center font-medium text-gray-800 mb-4">Supervising colleagues</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                      {clinicalSkillOptions.map((option) => (
                        <label key={option} className="flex items-center">
                          <input
                            type="radio"
                            name="supervisingColleagues"
                            value={option}
                            checked={formData.supervisingColleagues === option}
                            onChange={handleInputChange}
                            className="mr-2 text-blue-600"
                            required
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Commitment to care and wellbeing of patients */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-center font-medium text-gray-800 mb-4">Commitment to care and wellbeing of patients</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                      {clinicalSkillOptions.map((option) => (
                        <label key={option} className="flex items-center">
                          <input
                            type="radio"
                            name="commitmentToCare"
                            value={option}
                            checked={formData.commitmentToCare === option}
                            onChange={handleInputChange}
                            className="mr-2 text-blue-600"
                            required
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Communication with patients and relatives */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-center font-medium text-gray-800 mb-4">Communication with patients and relatives</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                      {clinicalSkillOptions.map((option) => (
                        <label key={option} className="flex items-center">
                          <input
                            type="radio"
                            name="communicationWithPatients"
                            value={option}
                            checked={formData.communicationWithPatients === option}
                            onChange={handleInputChange}
                            className="mr-2 text-blue-600"
                            required
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Working effectively with colleagues */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-center font-medium text-gray-800 mb-4">Working effectively with colleagues</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                      {clinicalSkillOptions.map((option) => (
                        <label key={option} className="flex items-center">
                          <input
                            type="radio"
                            name="workingEffectivelyWithColleagues"
                            value={option}
                            checked={formData.workingEffectivelyWithColleagues === option}
                            onChange={handleInputChange}
                            className="mr-2 text-blue-600"
                            required
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Effective time management */}
                  <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 className="text-center font-medium text-gray-800 mb-4">Effective time management</h3>
                    <div className="flex flex-wrap justify-center gap-4">
                      {clinicalSkillOptions.map((option) => (
                        <label key={option} className="flex items-center">
                          <input
                            type="radio"
                            name="effectiveTimeManagement"
                            value={option}
                            checked={formData.effectiveTimeManagement === option}
                            onChange={handleInputChange}
                            className="mr-2 text-blue-600"
                            required
                          />
                          <span className="text-sm text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Clinical Statement Section */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-green-600 text-center mb-6">Clinical Statement</h3>
                    
                    {/* This clinician respects patient confidentiality */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                      <h4 className="text-center font-medium text-gray-800 mb-4">This clinician respects patient confidentiality</h4>
                      <div className="flex flex-wrap justify-center gap-4">
                        {clinicalStatementOptions.map((option) => (
                          <label key={option} className="flex items-center">
                            <input
                              type="radio"
                              name="respectsPatientConfidentiality"
                              value={option}
                              checked={formData.respectsPatientConfidentiality === option}
                              onChange={handleInputChange}
                              className="mr-2 text-blue-600"
                              required
                            />
                            <span className="text-sm text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* This clinician is honest and trustworthy */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                      <h4 className="text-center font-medium text-gray-800 mb-4">This clinician is honest and trustworthy</h4>
                      <div className="flex flex-wrap justify-center gap-4">
                        {clinicalStatementOptions.map((option) => (
                          <label key={option} className="flex items-center">
                            <input
                              type="radio"
                              name="honestAndTrustworthy"
                              value={option}
                              checked={formData.honestAndTrustworthy === option}
                              onChange={handleInputChange}
                              className="mr-2 text-blue-600"
                              required
                            />
                            <span className="text-sm text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* This clinician's performance is not impaired by ill health */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                      <h4 className="text-center font-medium text-gray-800 mb-4">This clinician's performance is not impaired by ill health</h4>
                      <div className="flex flex-wrap justify-center gap-4">
                        {clinicalStatementOptions.map((option) => (
                          <label key={option} className="flex items-center">
                            <input
                              type="radio"
                              name="performanceNotImpaired"
                              value={option}
                              checked={formData.performanceNotImpaired === option}
                              onChange={handleInputChange}
                              className="mr-2 text-blue-600"
                              required
                            />
                            <span className="text-sm text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fitness to practice Section */}
                  <div className="mt-8">
                    <h3 className="text-lg font-semibold text-green-600 text-center mb-6">Fitness to practice</h3>
                    
                    {/* This clinician is fit to practice */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200 mb-4">
                      <h4 className="text-center font-medium text-gray-800 mb-4">This clinician is fit to practice</h4>
                      <div className="flex justify-center gap-6">
                        {fitnessOptions.map((option) => (
                          <label key={option} className="flex items-center">
                            <input
                              type="radio"
                              name="fitToPractice"
                              value={option}
                              checked={formData.fitToPractice === option}
                              onChange={handleInputChange}
                              className="mr-2 text-blue-600"
                              required
                            />
                            <span className="text-sm text-gray-700 font-medium">{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* When was the last time you worked with this clinician */}
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <h4 className="text-center font-medium text-gray-800 mb-4">When was the last time you worked with this clinician?</h4>
                      <div className="flex justify-center">
                        <input
                          type="date"
                          name="lastWorkedWith"
                          value={formData.lastWorkedWith}
                          onChange={handleInputChange}
                          required
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                        />
                      </div>
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
