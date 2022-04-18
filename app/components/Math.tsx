import Amount from './Amount'
import currency from 'currency.js'

interface MathProps {
  operation: 'add' | 'subtract'
  left: number
  right: number
}

export default function Math({ operation, left, right }: MathProps) {
  const leftCurrency = currency(left)

  const result = leftCurrency[operation](right)

  return <Amount amount={result} />
}
