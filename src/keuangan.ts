// Financial Module Engine - Mimicking Golang Backend Structures

export interface Expense {
  id: string;
  name: string;
  category: "Kebutuhan" | "Keinginan";
  type: "Sekali" | "Rutin";
  amount: number;
}

export interface MonthlyRecord {
  monthName: string;
  income: number;
  expenses: Expense[];
  totalExpense: number;
  savings: number;
  grade: string;
  advice: string;
}

export class FinancialState {
  months: string[] = [];
  records: Record<string, MonthlyRecord> = {};
  
  constructor() {
    this.initTimeline();
    this.loadData();
  }

  // Initialize 6 months
  private initTimeline() {
    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const d = new Date();
    let currentMonthIdx = d.getMonth();
    
    for (let i = 0; i < 6; i++) {
      const idx = (currentMonthIdx + i) % 12;
      const mName = monthNames[idx];
      this.months.push(mName);
      this.records[mName] = {
        monthName: mName,
        income: 0,
        expenses: [],
        totalExpense: 0,
        savings: 0,
        grade: "-",
        advice: "Silakan masukkan data keuangan Anda"
      };
    }
  }

  private loadData() {
    try {
      const stored = localStorage.getItem("anjay_financial_records");
      const storedMonths = localStorage.getItem("anjay_financial_months");
      if (stored && storedMonths) {
        const parsedMonths = JSON.parse(storedMonths);
        const parsedRecords = JSON.parse(stored);
        
        // Fast forward timeline if needed to match current month, or just use what we have.
        // For simplicity of keeping "EMPTY states", we'll just populate existing matched months
        let hasData = false;
        for (const m of this.months) {
            if (parsedRecords[m]) {
                this.records[m] = parsedRecords[m];
                hasData = true;
            }
        }
        
        if (hasData) {
            this.calculateLiveTotal();
        }
      }
    } catch(e) {
      console.warn("Could not load financial data", e);
    }
  }

  private saveData() {
    try {
      localStorage.setItem("anjay_financial_records", JSON.stringify(this.records));
      localStorage.setItem("anjay_financial_months", JSON.stringify(this.months));
    } catch(e) {
      console.warn("Could not save financial data", e);
    }
  }

  setIncome(monthName: string, income: number) {
    if (this.records[monthName]) {
      this.records[monthName].income = income;
      this.calculateLiveTotal();
      this.saveData();
    }
  }

  addExpense(monthName: string, expense: Expense) {
    const startIndex = this.months.indexOf(monthName);
    if (startIndex === -1) return;

    if (expense.type === "Sekali") {
      this.records[monthName].expenses.push({ ...expense });
    } else if (expense.type === "Rutin") {
      for (let i = startIndex; i < this.months.length; i++) {
        const m = this.months[i];
        this.records[m].expenses.push({ ...expense, id: expense.id + '_' + m });
      }
    }
    
    this.calculateLiveTotal();
    this.saveData();
  }

  deleteExpense(monthName: string, id: string) {
    if (this.records[monthName]) {
      this.records[monthName].expenses = this.records[monthName].expenses.filter(e => e.id !== id);
      this.calculateLiveTotal();
      this.saveData();
    }
  }

  cancelRoutine(monthName: string, id: string) {
    const startIndex = this.months.indexOf(monthName);
    if (startIndex === -1) return;

    // The id is likely appended with _Month, but let's just find the expense to extract the base ID if possible, or just expect the caller to pass the baseId or we can substring it.
    // Actually, when rendering, we know the object. Let's just find the expense by id in the current month to see its name. If we use name + type='Rutin' it's safer.
    const expense = this.records[monthName].expenses.find(e => e.id === id);
    if (!expense) return;

    // To cancel routine, we match by `name` and `type="Rutin"` just to be safe, since ID format is `baseId_month`. Or we can just extract baseId by doing `id.substring(0, id.lastIndexOf('_'))`.
    let baseId = id;
    if (expense.type === "Rutin" && id.includes('_')) {
      baseId = id.substring(0, id.lastIndexOf('_'));
    }

    for (let i = startIndex; i < this.months.length; i++) {
        const m = this.months[i];
        this.records[m].expenses = this.records[m].expenses.filter(e => {
            if (e.type === "Rutin" && e.id.startsWith(baseId)) return false;
            return true;
        });
    }

    this.calculateLiveTotal();
    this.saveData();
  }

  updateExpense(monthName: string, id: string, partial: Partial<Expense>) {
    if (this.records[monthName]) {
      const idx = this.records[monthName].expenses.findIndex(e => e.id === id);
      if (idx !== -1) {
        this.records[monthName].expenses[idx] = { ...this.records[monthName].expenses[idx], ...partial };
        this.calculateLiveTotal();
        this.saveData();
      }
    }
  }

  calculateLiveTotal() {
    for (let i = 0; i < this.months.length; i++) {
      const mName = this.months[i];
      const rec = this.records[mName];
      
      let tot = 0;
      for (const ex of rec.expenses) {
        tot += ex.amount;
      }
      rec.totalExpense = tot;
      rec.savings = rec.income - rec.totalExpense;
    }
    
    this.calculateScoringEngine();
  }

  private calculateScoringEngine() {
    let streak = 0;

    for (let i = 0; i < this.months.length; i++) {
      const mName = this.months[i];
      const rec = this.records[mName];

      if (rec.income <= 0 && rec.expenses.length === 0) {
        rec.grade = "-";
        rec.advice = "Silakan masukkan data keuangan Anda";
        streak = 0;
        continue;
      }

      if (rec.income <= 0) {
        rec.grade = "D";
        rec.advice = "Ayo tingkatkan lagi kedisiplinan finansialnya";
        streak = 0;
        continue;
      }

      const savingsPct = (rec.savings / rec.income) * 100;
      let percentageScore = 0;

      if (savingsPct < 25) {
        percentageScore = 20;
      } else if (savingsPct >= 25 && savingsPct <= 30) {
        percentageScore = 30;
      } else if (savingsPct > 30 && savingsPct <= 40) {
        percentageScore = 40;
      } else if (savingsPct > 50) {
        percentageScore = 50;
      } else {
        percentageScore = 45; // between 40-50 fallback
      }

      if (rec.savings > 0) {
        streak++;
      } else {
        streak = 0;
      }

      let consistencyScore = 0;
      if (streak >= 6) {
        consistencyScore = 50;
      } else if (streak >= 4) {
        consistencyScore = 40;
      } else if (streak >= 2) {
        consistencyScore = 30;
      } else {
        consistencyScore = 15;
      }

      const finalScore = percentageScore + consistencyScore;

      if (finalScore <= 40) {
        rec.grade = "D";
        rec.advice = "Ayo tingkatkan lagi kedisiplinan finansialnya";
      } else if (finalScore >= 41 && finalScore <= 60) {
        rec.grade = "C";
        rec.advice = "Bagus, lebih di tingkatkan lagi yuk";
      } else if (finalScore >= 61 && finalScore <= 80) {
        rec.grade = "B";
        rec.advice = "Semangat...!!! bulan depan harus grade A";
      } else {
        rec.grade = "A";
        rec.advice = "Pertahankan, kamu sudah pandai mengelola keuangan";
      }
    }
  }

  getCurrentMonthData(): MonthlyRecord {
    return this.records[this.months[0]];
  }

  getAllMonthsData(): MonthlyRecord[] {
    return this.months.map(m => this.records[m]);
  }
}
