import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Zap, 
  Target, 
  Clock, 
  AlertCircle,
  CheckCircle,
  RefreshCw 
} from 'lucide-react'
import { 
  PerformanceMetrics, 
  PerformanceReport, 
  LearnedPattern,
  ReflectionData 
} from '@/types'

interface PerformanceAnalyticsProps {
  className?: string
}

interface PerformanceData {
  metrics: PerformanceMetrics | null
  report: PerformanceReport | null
  reflectionData: ReflectionData | null
  isLoading: boolean
  error: string | null
}

export function PerformanceAnalytics({ className }: PerformanceAnalyticsProps) {
  const [data, setData] = useState<PerformanceData>({
    metrics: null,
    report: null,
    reflectionData: null,
    isLoading: true,
    error: null
  })
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('weekly')
  const [refreshing, setRefreshing] = useState(false)

  const fetchPerformanceData = async () => {
    try {
      setRefreshing(true)
      
      // Fetch performance metrics
      const metricsResponse = await fetch('/api/reflection/metrics')
      const metrics = metricsResponse.ok ? await metricsResponse.json() : null

      // Fetch performance report
      const reportResponse = await fetch(`/api/reflection/report?period=${timeRange}`)
      const report = reportResponse.ok ? await reportResponse.json() : null

      // Fetch reflection data (patterns and thresholds)
      const reflectionResponse = await fetch('/api/reflection/data')
      const reflectionData = reflectionResponse.ok ? await reflectionResponse.json() : null

      setData({
        metrics,
        report,
        reflectionData,
        isLoading: false,
        error: null
      })
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load performance data'
      }))
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPerformanceData()
  }, [timeRange])

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`
  const formatTime = (ms: number) => `${ms.toFixed(0)}ms`

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 0.9) return 'text-green-600'
    if (rate >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  if (data.isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading performance analytics...</span>
        </div>
      </div>
    )
  }

  if (data.error) {
    return (
      <div className={`space-y-6 ${className}`}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>{data.error}</span>
            </div>
            <Button onClick={fetchPerformanceData} className="mt-4">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { metrics, report, reflectionData } = data

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Performance Analytics</h2>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={fetchPerformanceData} 
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tools">Tool Performance</TabsTrigger>
          <TabsTrigger value="memory">Memory Analytics</TabsTrigger>
          <TabsTrigger value="patterns">Learning Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* System Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Zap className="h-4 w-4 mr-2 text-blue-500" />
                  Overall Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {reflectionData?.confidence.overall 
                    ? formatPercentage(reflectionData.confidence.overall)
                    : 'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">System confidence</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Target className="h-4 w-4 mr-2 text-green-500" />
                  Memory Hit Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.memory.hitRate 
                    ? formatPercentage(metrics.memory.hitRate)
                    : 'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">Search accuracy</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-orange-500" />
                  Avg Response Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics?.system.responseTime 
                    ? formatTime(metrics.system.responseTime)
                    : 'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">System latency</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center">
                  <BarChart3 className="h-4 w-4 mr-2 text-purple-500" />
                  Active Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {reflectionData?.patterns.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Learned behaviors</p>
              </CardContent>
            </Card>
          </div>

          {/* Insights and Recommendations */}
          {report && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
                    Key Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.insights.map((insight, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{insight}</span>
                      </div>
                    ))}
                    {report.insights.length === 0 && (
                      <p className="text-sm text-muted-foreground">No insights available for this period.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingDown className="h-5 w-5 mr-2 text-orange-500" />
                    Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start space-x-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 text-orange-500 flex-shrink-0" />
                        <span className="text-sm">{recommendation}</span>
                      </div>
                    ))}
                    {report.recommendations.length === 0 && (
                      <p className="text-sm text-muted-foreground">No recommendations at this time.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tools" className="space-y-4">
          {/* Tool Performance Metrics */}
          {metrics?.tools && (
            <Card>
              <CardHeader>
                <CardTitle>Tool Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(metrics.tools.usage).map(([tool, usage]) => {
                    const successRate = metrics.tools.successRates[tool] || 0
                    const avgTime = metrics.tools.avgExecutionTime[tool] || 0
                    const errors = metrics.tools.errorCounts[tool] || 0

                    return (
                      <div key={tool} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{tool}</h4>
                          <Badge variant="outline">{usage} uses</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Success Rate</p>
                            <p className={`font-semibold ${getSuccessRateColor(successRate)}`}>
                              {formatPercentage(successRate)}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Time</p>
                            <p className="font-semibold">{formatTime(avgTime)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Errors</p>
                            <p className="font-semibold">{errors}</p>
                          </div>
                        </div>
                        <Progress 
                          value={successRate * 100} 
                          className="mt-2"
                        />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="memory" className="space-y-4">
          {/* Memory Analytics */}
          {metrics?.memory && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Search Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-muted-foreground">Hit Rate</span>
                        <span className="text-sm font-semibold">
                          {formatPercentage(metrics.memory.hitRate)}
                        </span>
                      </div>
                      <Progress value={metrics.memory.hitRate * 100} />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-muted-foreground">Search Accuracy</span>
                        <span className="text-sm font-semibold">
                          {formatPercentage(metrics.memory.searchAccuracy)}
                        </span>
                      </div>
                      <Progress value={metrics.memory.searchAccuracy * 100} />
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">Total Searches</p>
                      <p className="text-lg font-semibold">{metrics.memory.searchCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          {/* Learning Patterns */}
          {reflectionData?.patterns && (
            <Card>
              <CardHeader>
                <CardTitle>Learned Patterns</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {reflectionData.patterns.map((pattern) => (
                    <div key={pattern.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{pattern.description}</h4>
                        <Badge className={getConfidenceColor(pattern.confidence)}>
                          {formatPercentage(pattern.confidence)} confidence
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Type</p>
                          <p className="font-semibold capitalize">{pattern.type.replace('_', ' ')}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Success Rate</p>
                          <p className="font-semibold">{formatPercentage(pattern.successRate)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Times Triggered</p>
                          <p className="font-semibold">{pattern.timesTriggered}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Last Triggered</p>
                          <p className="font-semibold">
                            {new Date(pattern.lastTriggered).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      {pattern.indicators.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-muted-foreground mb-1">Key Indicators:</p>
                          <div className="flex flex-wrap gap-1">
                            {pattern.indicators.map((indicator, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {indicator}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {reflectionData.patterns.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No learning patterns detected yet. The system will begin learning from your usage patterns.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}