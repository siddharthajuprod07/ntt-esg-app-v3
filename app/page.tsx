import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowRight, 
  BarChart3, 
  CheckCircle, 
  FileText, 
  Globe, 
  Shield, 
  TrendingUp, 
  Users,
  Leaf,
  Building2,
  Target,
  Award
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <section className="relative px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <Badge className="mb-4" variant="secondary">
              ESG Compliance Made Simple
            </Badge>
            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
              Transform Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600">
                Sustainability Journey
              </span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
              Comprehensive ESG assessment platform that helps organizations measure, track, and improve their environmental, social, and governance performance with data-driven insights.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/auth/register">
                <Button size="lg" className="h-12 px-8 text-base">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      {/* Stats Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">500+</div>
              <div className="mt-2 text-sm text-gray-600">Organizations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">10K+</div>
              <div className="mt-2 text-sm text-gray-600">Surveys Completed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">98%</div>
              <div className="mt-2 text-sm text-gray-600">Customer Satisfaction</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900">50+</div>
              <div className="mt-2 text-sm text-gray-600">ESG Metrics</div>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section id="features" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Everything you need for ESG excellence
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Powerful features designed to streamline your sustainability reporting
            </p>
          </div>
          
          <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Smart Survey Builder</CardTitle>
                <CardDescription>
                  Create comprehensive ESG assessments with our intuitive drag-and-drop builder and pre-built templates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Real-time Analytics</CardTitle>
                <CardDescription>
                  Track performance metrics with interactive dashboards and generate insights from your ESG data
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Automated Scoring</CardTitle>
                <CardDescription>
                  Calculate ESG scores automatically based on industry standards and custom weighted algorithms
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Global Compliance</CardTitle>
                <CardDescription>
                  Align with international ESG frameworks including GRI, SASB, TCFD, and UN Global Compact
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle>Enterprise Security</CardTitle>
                <CardDescription>
                  Bank-grade encryption, role-based access control, and comprehensive audit trails for data protection
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-indigo-600" />
                </div>
                <CardTitle>Team Collaboration</CardTitle>
                <CardDescription>
                  Collaborate across departments with multi-user support and customizable permission levels
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
      {/* ESG Categories Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Comprehensive ESG Assessment
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Cover all aspects of sustainability with our integrated approach
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <Card className="border-2 border-green-200 bg-green-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Leaf className="h-8 w-8 text-green-600" />
                  <Badge className="bg-green-100 text-green-700">Environmental</Badge>
                </div>
                <CardTitle className="mt-4">Environmental Impact</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Carbon footprint tracking
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Resource efficiency metrics
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Waste management analysis
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    Biodiversity assessment
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-200 bg-blue-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Users className="h-8 w-8 text-blue-600" />
                  <Badge className="bg-blue-100 text-blue-700">Social</Badge>
                </div>
                <CardTitle className="mt-4">Social Responsibility</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                    Employee wellbeing programs
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                    Diversity & inclusion metrics
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                    Community engagement
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-blue-600 mr-2" />
                    Health & safety standards
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 bg-purple-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Building2 className="h-8 w-8 text-purple-600" />
                  <Badge className="bg-purple-100 text-purple-700">Governance</Badge>
                </div>
                <CardTitle className="mt-4">Corporate Governance</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-purple-600 mr-2" />
                    Board structure evaluation
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-purple-600 mr-2" />
                    Ethics & compliance
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-purple-600 mr-2" />
                    Risk management systems
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-purple-600 mr-2" />
                    Transparency reporting
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <Card className="border-0 shadow-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardHeader className="pb-8 pt-12">
              <Award className="h-16 w-16 mx-auto mb-4 text-yellow-300" />
              <CardTitle className="text-3xl font-bold text-white">
                Ready to elevate your ESG performance?
              </CardTitle>
              <CardDescription className="text-blue-100 text-lg mt-4">
                Join leading organizations in building a sustainable future. Start your free trial today and get access to all features for 30 days.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-12">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/auth/register">
                  <Button size="lg" variant="secondary" className="h-12 px-8 text-base">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/contact">
                  <Button size="lg" variant="outline" className="h-12 px-8 text-base bg-white/10 text-white border-white/30 hover:bg-white/20">
                    Schedule Demo
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Target className="h-6 w-6 text-green-500" />
                <span className="text-xl font-bold text-white">ESG Survey</span>
              </div>
              <p className="text-sm">
                Empowering organizations to measure and improve their sustainability impact.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-white">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="hover:text-white">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact</Link></li>
                <li><Link href="/careers" className="hover:text-white">Careers</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/support" className="hover:text-white">Support</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm">
            <p>&copy; 2024 ESG Survey Platform. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}