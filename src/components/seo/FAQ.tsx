'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'Can I see Northern Lights in Tromsø tonight?',
    answer: 'Based on live solar wind and local cloud coverage data, check our live forecast page for the current status. We provide real-time updates with GO/WAIT/NO recommendations to help you decide when to go aurora hunting.'
  },
  {
    question: 'What time is best for Northern Lights in Tromsø tonight?',
    answer: 'The best viewing time varies by solar activity and weather conditions. Typically, the strongest activity occurs between 22:00 and 02:00 during winter months. Check our detailed forecast page for tonight\'s peak activity window.'
  },
  {
    question: 'Where should I drive to see aurora from Tromsø?',
    answer: 'The best locations depend on current cloud coverage. Popular spots include Ersfjordbotn (25 min drive), Sommarøy (1 hour), and Kvaløya west coast (30-40 min). Use our live map to find clear skies and dark viewing areas in real-time.'
  },
  {
    question: 'Is a KP index of 3 good for Tromsø?',
    answer: 'KP 3 is moderate activity and often visible in Tromsø due to its high latitude (69.6°N). Even KP 2-3 can produce visible aurora with clear skies. The most important factor is local cloud coverage, which we monitor in real-time.'
  },
  {
    question: 'How do I use aurora.tromso.ai?',
    answer: 'Simply check the homepage for the current GO/WAIT/NO status. Green (GO) means go outside now, Yellow (WAIT) means conditions are improving, and Red (NO) means wait for better conditions. Use the forecast page for planning ahead and the live map for finding the best viewing spots.'
  },
  {
    question: 'What makes your forecast different?',
    answer: 'We combine real-time solar wind data from NOAA with local cloud coverage from Met.no to give you actionable decisions (GO/WAIT/NO), not just raw data. We focus on what tourists actually need: a clear answer to "should I go out now?"'
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Frequently Asked Questions
        </h2>
        <p className="text-white/70 text-lg">
          Everything you need to know about aurora hunting in Tromsø
        </p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-arctic-800/50 border border-white/10 rounded-lg overflow-hidden transition-all"
          >
            <button
              onClick={() => toggleFAQ(index)}
              className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-arctic-800/70 transition-colors"
            >
              <span className="text-white font-semibold pr-4">{faq.question}</span>
              <ChevronDown
                className={`w-5 h-5 text-primary flex-shrink-0 transition-transform ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="px-6 py-4 border-t border-white/5 bg-arctic-900/50">
                <p className="text-white/80 leading-relaxed">{faq.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
