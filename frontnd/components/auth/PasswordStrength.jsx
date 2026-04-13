import { cn } from '../../lib/utils';

export default function PasswordStrength({ strength }) {
  const getStrengthText = () => {
    switch (strength) {
      case 'weak': return 'Weak';
      case 'medium': return 'Medium';
      case 'strong': return 'Strong';
      default: return '';
    }
  };

  const getStrengthColor = () => {
    switch (strength) {
      case 'weak': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'strong': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="mt-2 text-xs font-medium">
      <span className={cn('uppercase tracking-wide', getStrengthColor())}>
        Password strength: {getStrengthText()}
      </span>
    </div>
  );
}
