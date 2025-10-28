interface Row {
    Date?: string;
    Description?: string;
    Category?: string;
    Amount?: string;
}

export function summarizeAccounts(rows: Row[]) {
    const validRows = rows.filter((r) => r.Amount && !isNaN(parseFloat(r.Amount!)));

    const income = validRows
        .filter((r) => parseFloat(r.Amount!) > 0)
        .reduce((sum, r) => sum + parseFloat(r.Amount!), 0);

    const expenses = validRows
        .filter((r) => parseFloat(r.Amount!) < 0)
        .reduce((sum, r) => sum + parseFloat(r.Amount!), 0);

    const net = income + expenses;

    const topTransactions = [...validRows]
        .sort((a, b) => Math.abs(parseFloat(b.Amount!)) - Math.abs(parseFloat(a.Amount!)))
        .slice(0, 5);

    const byCategory: Record<string, number> = {};
    validRows.forEach((r) => {
        const cat = r.Category || "Uncategorized";
        byCategory[cat] = (byCategory[cat] || 0) + parseFloat(r.Amount!);
    });

    return { income, expenses, net, topTransactions, byCategory };
}
