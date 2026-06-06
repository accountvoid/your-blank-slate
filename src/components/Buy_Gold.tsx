import React, { useState } from 'react';

const SETVOID_LOGO = "/SETVOIDUI.png";
const WALLET_ADDRESS = "0xC87bc9D4F2f640Ad27cdEc62754A18A8CAea8231";

const GoldPurchasePage = () => {
  const [step, setStep] = useState(1); // 1: اختيار العرض، 2: الدفع
  const [selectedOffer, setSelectedOffer] = useState<{ amount: string; price: string } | null>(null);

  const offers = [
    { amount: "10g Gold", price: "$850" },
    { amount: "50g Gold", price: "$4,200" },
    { amount: "100g Gold", price: "$8,350" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-gray-800 pb-6 mb-10">
        <img src={SETVOID_LOGO} alt="SETVOID" className="h-12 w-auto" />
        <span className="text-gray-500 text-sm font-mono tracking-widest">SYSTEM_VERSION: 1.0.0</span>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto border border-gray-800 p-8 bg-[#0a0a0a] rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)]">
        {step === 1 ? (
          <div>
            <h2 className="text-2xl font-bold mb-6 text-yellow-500">اختر كمية الذهب المطلوبة</h2>
            <div className="grid gap-4">
              {offers.map((offer, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedOffer(offer); setStep(2); }}
                  className="flex justify-between p-6 bg-gray-900 border border-gray-700 hover:border-yellow-500 transition-all rounded-lg"
                >
                  <span className="text-xl">{offer.amount}</span>
                  <span className="font-mono text-yellow-400">{offer.price}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold mb-4">طريقة الدفع</h2>
            
            {/* Payment Options */}
            <div className="space-y-4">
              {/* Crypto Option */}
              <div className="p-6 bg-gray-900 border border-yellow-600 rounded-lg">
                <h3 className="font-bold text-yellow-500 mb-2">العملات المشفرة (ERC20)</h3>
                <p className="text-sm text-gray-400 mb-4">يرجى التحويل إلى العنوان التالي:</p>
                <code className="block bg-black p-3 text-xs text-yellow-300 border border-gray-700 mb-4 break-all">
                  {WALLET_ADDRESS}
                </code>
                <a 
                  href="mailto:setvoid.app@gmail.com?subject=إثبات دفع - شراء ذهب&body=تم إرسال المبلغ. مرفق لقطة الشاشة."
                  className="block w-full text-center py-3 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded"
                >
                  إرسال إثبات الدفع (Email)
                </a>
              </div>

              {/* Bank Option (Locked) */}
              <div className="p-6 bg-gray-950 border border-gray-800 rounded-lg opacity-50 cursor-not-allowed">
                <h3 className="font-bold text-gray-500">التحويل البنكي</h3>
                <p className="text-sm text-gray-600">هذه الخاصية غير مفعلة حالياً في نظام SETVOID</p>
              </div>
            </div>
            <button onClick={() => setStep(1)} className="mt-6 text-gray-500 underline text-sm">رجوع</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default GoldPurchasePage;

