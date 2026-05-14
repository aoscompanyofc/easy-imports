import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: keyof typeof LucideIcons;
  phase: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
  icon,
  phase,
}) => {
  const IconComponent = LucideIcons[icon] as React.ElementType;
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500">
      <div className="w-24 h-24 rounded-3xl bg-primary-50 flex items-center justify-center text-primary mb-8 border-4 border-white shadow-xl shadow-primary/10">
        {IconComponent && <IconComponent size={48} />}
      </div>
      
      <h1 className="text-3xl font-bold text-neutral-900 mb-3">{title}</h1>
      <p className="text-neutral-500 max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      
      <Badge variant="primary" size="md" className="mb-10 px-4 py-1.5 rounded-lg border border-primary-200">
        Disponível na {phase}
      </Badge>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          variant="secondary" 
          onClick={() => navigate('/dashboard')}
          leftIcon={<LucideIcons.ArrowLeft size={18} />}
        >
          Voltar ao Dashboard
        </Button>
        <Button 
          variant="primary"
          onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
          leftIcon={<LucideIcons.MessageCircle size={18} />}
        >
          Suporte Técnico
        </Button>
      </div>
    </div>
  );
};
