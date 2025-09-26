import { Link } from 'react-router-dom';
import { 
  ChefHat, 
  Facebook, 
  Instagram, 
  Twitter, 
  Youtube,
  Mail,
  Phone,
  MapPin 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Newsletter Section */}
        <div className="border-b border-secondary-foreground/10 py-12">
          <div className="max-w-4xl mx-auto text-center">
            <h3 className="font-display text-2xl md:text-3xl font-bold mb-4">
              Get Fresh Recipes Weekly
            </h3>
            <p className="text-secondary-foreground/80 mb-8 max-w-2xl mx-auto">
              Join 50,000+ food lovers and get handpicked recipes, cooking tips, 
              and exclusive content delivered to your inbox every week.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <Input
                placeholder="Enter your email address"
                className="bg-background/90 border-border text-foreground placeholder:text-muted-foreground"
              />
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 whitespace-nowrap">
                Subscribe
              </Button>
            </div>
            <p className="text-sm text-secondary-foreground/60 mt-3">
              No spam, unsubscribe anytime. We respect your privacy.
            </p>
          </div>
        </div>

        {/* Main Footer Content */}
        <div className="py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Company Info */}
            <div className="lg:col-span-1">
              <Link to="/" className="flex items-center space-x-2 mb-6">
                <ChefHat className="h-8 w-8 text-primary" />
                <span className="font-display text-2xl font-bold">
                  FlavorQuest
                </span>
              </Link>
              <p className="text-secondary-foreground/80 mb-6 leading-relaxed">
                Discover your culinary passion with our AI-powered recipe platform. 
                From beginner-friendly meals to gourmet adventures, we make cooking 
                accessible and enjoyable for everyone.
              </p>
              
              {/* Social Links */}
              <div className="flex space-x-4">
                {[
                  { icon: Facebook, href: '#', label: 'Facebook' },
                  { icon: Instagram, href: '#', label: 'Instagram' },
                  { icon: Twitter, href: '#', label: 'Twitter' },
                  { icon: Youtube, href: '#', label: 'YouTube' }
                ].map(({ icon: Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="p-2 rounded-lg bg-secondary-foreground/10 hover:bg-primary hover:text-primary-foreground transition-all duration-300 group"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Recipes */}
            <div>
              <h4 className="font-semibold text-lg mb-6">Explore Recipes</h4>
              <ul className="space-y-3">
                {[
                  'Popular Recipes',
                  'Quick & Easy',
                  'Healthy Options',
                  'Vegetarian',
                  'Desserts',
                  'International Cuisine'
                ].map((link) => (
                  <li key={link}>
                    <Link 
                      to="#" 
                      className="text-secondary-foreground/80 hover:text-primary transition-colors duration-300"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-lg mb-6">Company</h4>
              <ul className="space-y-3">
                {[
                  'About Us',
                  'Our Chefs',
                  'Careers',
                  'Press',
                  'Blog',
                  'Partnerships'
                ].map((link) => (
                  <li key={link}>
                    <Link 
                      to="#" 
                      className="text-secondary-foreground/80 hover:text-primary transition-colors duration-300"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Support & Contact */}
            <div>
              <h4 className="font-semibold text-lg mb-6">Support</h4>
              <ul className="space-y-3 mb-6">
                {[
                  'Help Center',
                  'Contact Support',
                  'Privacy Policy',
                  'Terms of Service',
                  'Cookie Policy'
                ].map((link) => (
                  <li key={link}>
                    <Link 
                      to="#" 
                      className="text-secondary-foreground/80 hover:text-primary transition-colors duration-300"
                    >
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-sm text-secondary-foreground/80">
                    hello@flavorquest.com
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="text-sm text-secondary-foreground/80">
                    1-800-FLAVOR-1
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-4 w-4 text-primary mt-0.5" />
                  <span className="text-sm text-secondary-foreground/80">
                    123 Culinary Street<br />
                    Food District, FC 12345
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-secondary-foreground/10 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-secondary-foreground/60">
              © 2024 FlavorQuest. All rights reserved. Made with ❤️ for food lovers worldwide.
            </div>
            
            <div className="flex items-center space-x-6">
              <Link 
                to="#" 
                className="text-sm text-secondary-foreground/60 hover:text-primary transition-colors duration-300"
              >
                Accessibility
              </Link>
              <Link 
                to="#" 
                className="text-sm text-secondary-foreground/60 hover:text-primary transition-colors duration-300"
              >
                Sitemap
              </Link>
              <Link 
                to="#" 
                className="text-sm text-secondary-foreground/60 hover:text-primary transition-colors duration-300"
              >
                Download App
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;