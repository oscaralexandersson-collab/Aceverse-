
import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName: string;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, onClose, onConfirm, itemName }) => {
    const { t } = useLanguage();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn" 
                onClick={onClose}
            ></div>
            
            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-slideUp">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertTriangle size={40} className="text-red-500" />
                    </div>
                    
                    <h3 className="font-serif-display text-2xl text-gray-900 dark:text-white mb-3 px-4">
                        {t('common.deleteConfirm').replace('{name}', itemName)}
                    </h3>
                    
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 px-6">
                        {t('common.deleteWarning')}
                    </p>
                    
                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onConfirm();
                            }}
                            className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} /> {t('common.yesDelete')}
                        </button>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className="w-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 py-4 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                    </div>
                </div>
                
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default DeleteConfirmModal;
