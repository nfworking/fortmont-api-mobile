import React from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import {
  Zap,
  Palette,
  Shield,
  Settings,
  Layers,
  Rocket,
} from 'lucide-react-native';

function cn(...args: Array<string | false | null | undefined>) {
  return args.filter(Boolean).join(' ');
}

interface FeatureIconListItem {
  title: string;
  description: string;
  icon?: React.ReactNode;
  href?: string;
}
interface ButtonType {
  text: string;
  url: string;
  icon?: React.ReactNode;
}
interface Buttons {
  primary?: ButtonType;
  secondary?: ButtonType;
}

interface FeatureIconListProps {
  heading: string;
  label?: string;
  features?: FeatureIconListItem[];
  buttons?: Buttons;
  className?: string;
}

const defaultProps: FeatureIconListProps = {
  heading: 'Keep up to date in your Homelab with production ready API',
  label: 'Features',
  features: [
    {
      icon: <Zap color="#fff" size={18} />,
      title: 'Full Source Code',
      description:
        'The entire codebase in open source on GitHub. No closed source components, no hidden dependencies.',
    },
    {
      icon: <Palette color="#fff" size={18} />,
      title: 'Responsive Design',
      description:
        "Every block adapts seamlessly from mobile to desktop with Tailwind's mobile-first utility classes.",
    },
    {
      icon: <Shield color="#fff" size={18} />,
      title: 'Security Focused',
      description:
        'Built with best practices and minimal dependencies to reduce attack surface. Regularly audited and updated.',
    },
    {
      icon: <Settings color="#fff" size={18} />,
      title: 'Full admin Control',
      description:
        'Information and entries can be easily managed through the API or the dashboard. You have full control over your data and how you want to manage it.',
    },
    {
      icon: <Layers color="#fff" size={18} />,
      title: 'Customizable',
      description:
        'Source is open, so you can customize it to fit your needs. Add new features, modify existing ones, or integrate with other tools in your homelab.',
    },
    {
      icon: <Rocket color="#fff" size={18} />,
      title: 'Production Ready',
      description:
        'Battle-tested in real projects. No placeholder hacks, no lorem ipsum — clean code you run in your lab.',
    },
  ],
  buttons: {
    primary: {
      text: 'Browse Components',
      url: 'https://www.shadcnblocks.com',
    },
  },
};

const MAX_FEATURES = 6;

export const Feature17: React.FC<Partial<FeatureIconListProps>> = (props) => {
  const { heading, label, features, buttons, className } = {
    ...defaultProps,
    ...props,
  };
  const items = (features ?? []).slice(0, MAX_FEATURES);

  return (
    <View className={cn(' pb-8 px-6', className)}>
      {(label || heading) && (
        <View className="mx-auto mb-6 max-w-3xl items-center">
          {label && <Text className="text-sm text-gray-400 mb-2">{label}</Text>}
          <Text className="text-2xl font-semibold text-center text-white">{heading}</Text>
        </View>
      )}

      <View className="mx-auto w-full max-w-6xl">
        {items.map((feature, idx) => (
          <View key={idx} className="flex-row items-start gap-4 mb-6">
            <View className="w-10 h-10 rounded-full items-center justify-center bg-neutral-800 dark:bg-neutral-200">
              {feature.icon}
            </View>
            <View className="flex-1">
              <Text className="text-base font-medium text-white">{feature.title}</Text>
              <Text className="text-sm text-gray-300">{feature.description}</Text>
            </View>
          </View>
        ))}

        {buttons?.primary?.url && (
          <View className="mt-6 items-center">
            <Pressable
              onPress={() => {
                Linking.openURL(buttons.primary!.url).catch(() => {});
              }}
              className="px-6 py-3 rounded-lg bg-white"
            >
              <Text className="text-black font-semibold">{buttons.primary.text}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};

export default Feature17;
