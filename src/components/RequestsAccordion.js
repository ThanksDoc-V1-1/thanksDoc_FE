import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const AccordionSection = ({ 
  title, 
  subtitle, 
  count, 
  isOpen, 
  onToggle, 
  children, 
  isDarkMode = false,
  icon: Icon,
  isNew = false 
}) => {
  return (
    <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} last:border-b-0`}>
      <button
        onClick={onToggle}
        className={`w-full px-6 py-4 text-left transition-colors ${
          isDarkMode 
            ? 'hover:bg-gray-700/50' 
            : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className={`p-2 rounded-lg`} style={{backgroundColor: isDarkMode ? 'rgba(15, 146, 151, 0.3)' : '#0F9297'}}>
                <Icon className={`h-4 w-4`} style={{color: isDarkMode ? '#0F9297' : 'white'}} />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {title}
                </h3>
                {count > 0 && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                    isNew 
                      ? isDarkMode 
                        ? 'bg-red-900/30 text-red-400 border border-red-700' 
                        : 'bg-red-600 text-white border border-red-500'
                      : isDarkMode 
                        ? 'bg-blue-900/30 text-blue-400 border border-blue-700' 
                        : 'bg-blue-600 text-white border border-blue-500'
                  }`}>
                    {count}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {isOpen ? (
              <ChevronUp className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            ) : (
              <ChevronDown className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            )}
          </div>
        </div>
      </button>
      {isOpen && (
        <div className={`${isDarkMode ? 'bg-gray-800/30' : 'bg-gray-50/50'}`}>
          {children}
        </div>
      )}
    </div>
  );
};

const RequestsAccordion = ({ 
  pendingRequests = [], 
  acceptedRequests = [], 
  completedRequests = [], 
  isDarkMode = false,
  renderRequest
}) => {
  const [openSections, setOpenSections] = useState({
    pending: pendingRequests.length > 0, // Open by default if there are pending requests
    accepted: false,
    completed: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className={`rounded-lg shadow border ${
      isDarkMode 
        ? 'bg-gray-900 border-gray-800' 
        : 'bg-white/90 border-blue-200'
    }`}>
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <AccordionSection
          title="New Requests"
          subtitle="Pending requests requiring your response"
          count={pendingRequests.length}
          isOpen={openSections.pending}
          onToggle={() => toggleSection('pending')}
          isDarkMode={isDarkMode}
          isNew={true}
        >
          <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {pendingRequests.map(renderRequest)}
          </div>
        </AccordionSection>
      )}

      {/* Accepted Requests */}
      {acceptedRequests.length > 0 && (
        <AccordionSection
          title="Accepted Requests"
          subtitle="Requests you have accepted and are working on"
          count={acceptedRequests.length}
          isOpen={openSections.accepted}
          onToggle={() => toggleSection('accepted')}
          isDarkMode={isDarkMode}
        >
          <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {acceptedRequests.map(renderRequest)}
          </div>
        </AccordionSection>
      )}

      {/* Completed Requests */}
      {completedRequests.length > 0 && (
        <AccordionSection
          title="Completed Requests"
          subtitle="Successfully completed service requests"
          count={completedRequests.length}
          isOpen={openSections.completed}
          onToggle={() => toggleSection('completed')}
          isDarkMode={isDarkMode}
        >
          <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {completedRequests.map(renderRequest)}
          </div>
        </AccordionSection>
      )}

      {/* Empty State */}
      {pendingRequests.length === 0 && acceptedRequests.length === 0 && completedRequests.length === 0 && (
        <div className="p-8 text-center">
          <div className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            No service requests available
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Check back later for new requests from businesses in your area.
          </p>
        </div>
      )}
    </div>
  );
};

export default RequestsAccordion;