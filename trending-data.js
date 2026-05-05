// trending-data.js — static trending items per calculator
// DYNAMIC-SLOT: replace with fetch('/api/trending') when backend is ready

const TRENDING_DATA = {
  global: [
    { text: 'Mortgage rates hit 6.8% — recalculate your payment', tag: 'Housing',   calc: 'mortgage'   },
    { text: '2026 tax brackets updated — check your refund',       tag: 'Tax',       calc: 'tax'        },
    { text: 'Average US tip rate rises to 20%',                    tag: 'Dining',    calc: 'tip'        },
    { text: 'Student loan forgiveness — recalculate your balance', tag: 'Education', calc: 'loan'       },
    { text: 'BMI guidelines updated for 2026',                     tag: 'Health',    calc: 'bmi'        },
  ],
  standard: [
    { text: 'Quick math: how much is your raise worth after tax?', tag: 'Finance',   calc: 'tax'        },
    { text: 'Calculate your monthly savings goal',                 tag: 'Finance',   calc: 'percentage' },
    { text: 'How much tip on a $85 dinner for two?',               tag: 'Dining',    calc: 'tip'        },
    { text: 'Split the bill with our tip calculator',              tag: 'Dining',    calc: 'tip'        },
    { text: 'What percentage of your income goes to rent?',        tag: 'Housing',   calc: 'percentage' },
  ],
  mortgage: [
    { text: 'Fed holds rates — what it means for your mortgage',   tag: 'Housing',   calc: 'mortgage'   },
    { text: '30-year fixed rate drops to 6.5%',                    tag: 'Housing',   calc: 'mortgage'   },
    { text: 'How much house can you afford on $90k salary?',       tag: 'Housing',   calc: 'mortgage'   },
    { text: 'PMI explained: when can you drop it?',                tag: 'Housing',   calc: 'mortgage'   },
    { text: 'Refinancing at 0.5% lower saves $100/month',          tag: 'Housing',   calc: 'mortgage'   },
  ],
  bmi: [
    { text: 'New BMI categories for 2026',                         tag: 'Health',    calc: 'bmi'        },
    { text: 'Healthy weight ranges by height',                     tag: 'Health',    calc: 'bmi'        },
    { text: 'CDC updates BMI screening guidelines',                tag: 'Health',    calc: 'bmi'        },
    { text: 'BMI vs body fat percentage — what matters more?',     tag: 'Health',    calc: 'bmi'        },
    { text: 'Calculate your ideal weight range',                   tag: 'Health',    calc: 'bmi'        },
  ],
  tax: [
    { text: '2026 standard deduction increased to $15,000',        tag: 'Tax',       calc: 'tax'        },
    { text: 'IRS announces new withholding tables for 2026',       tag: 'Tax',       calc: 'tax'        },
    { text: 'April 15 deadline — are you ready to file?',          tag: 'Tax',       calc: 'tax'        },
    { text: 'How the new tax brackets affect your paycheck',       tag: 'Tax',       calc: 'tax'        },
    { text: 'Married filing jointly vs separately — which saves?', tag: 'Tax',       calc: 'tax'        },
  ],
  tip: [
    { text: 'Is 20% the new standard tip in America?',             tag: 'Dining',    calc: 'tip'        },
    { text: 'How to split a bill fairly among friends',            tag: 'Dining',    calc: 'tip'        },
    { text: 'Tip fatigue: Americans push back on tip prompts',     tag: 'Dining',    calc: 'tip'        },
    { text: 'How much to tip your delivery driver in 2026',        tag: 'Dining',    calc: 'tip'        },
    { text: 'Restaurant tipping etiquette guide 2026',             tag: 'Dining',    calc: 'tip'        },
  ],
  loan: [
    { text: 'Auto loan rates rise — calculate your new payment',   tag: 'Auto',      calc: 'loan'       },
    { text: 'Personal loan vs credit card — which costs less?',    tag: 'Finance',   calc: 'loan'       },
    { text: 'Student loan forgiveness update — check your balance',tag: 'Education', calc: 'loan'       },
    { text: 'How extra payments cut your loan term in half',       tag: 'Finance',   calc: 'loan'       },
    { text: 'Best personal loan rates in April 2026',              tag: 'Finance',   calc: 'loan'       },
  ],
  percentage: [
    { text: 'How to calculate a discount quickly',                 tag: 'Shopping',  calc: 'percentage' },
    { text: 'What is 15% of $240? Use our percentage calc',        tag: 'Math',      calc: 'percentage' },
    { text: 'Inflation calculator: how much has $100 changed?',    tag: 'Finance',   calc: 'percentage' },
    { text: 'Calculate your raise as a percentage increase',       tag: 'Finance',   calc: 'percentage' },
    { text: 'Sales tax by state — what percentage do you pay?',    tag: 'Tax',       calc: 'tax'        },
  ],
  age: [
    { text: 'How many days until your next birthday?',             tag: 'Fun',       calc: 'age'        },
    { text: 'Retirement age calculator — when can you retire?',    tag: 'Finance',   calc: 'loan'       },
    { text: 'Social Security full retirement age by birth year',   tag: 'Finance',   calc: 'age'        },
    { text: 'Medicare eligibility age — are you close?',           tag: 'Health',    calc: 'bmi'        },
    { text: 'How old are you in days, hours, and minutes?',        tag: 'Fun',       calc: 'age'        },
  ],
};
