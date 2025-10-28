"use client";

export default function Report({ report }: { report: any }) {
    const { income, expenses, net, topTransactions, byCategory } = report;

    return (
        <div className="mt-8 bg-white shadow p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Financial Report</h2>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-100 rounded-lg">
                    <h3 className="font-semibold">Total Income</h3>
                    <p className="text-2xl font-bold text-green-700">${income.toFixed(2)}</p>
                </div>
                <div className="p-4 bg-red-100 rounded-lg">
                    <h3 className="font-semibold">Total Expenses</h3>
                    <p className="text-2xl font-bold text-red-700">${Math.abs(expenses).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-blue-100 rounded-lg">
                    <h3 className="font-semibold">Net Balance</h3>
                    <p className="text-2xl font-bold text-blue-700">${net.toFixed(2)}</p>
                </div>
            </div>

            <section className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Top 5 Transactions</h3>
                <table className="min-w-full border text-sm">
                    <thead>
                        <tr className="bg-gray-100 text-left">
                            <th className="border p-2">Date</th>
                            <th className="border p-2">Description</th>
                            <th className="border p-2">Category</th>
                            <th className="border p-2 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topTransactions.map((t: any, i: number) => (
                            <tr key={i}>
                                <td className="border p-2">{t.Date}</td>
                                <td className="border p-2">{t.Description}</td>
                                <td className="border p-2">{t.Category || "Uncategorized"}</td>
                                <td
                                    className={`border p-2 text-right ${parseFloat(t.Amount) > 0 ? "text-green-700" : "text-red-700"
                                        }`}
                                >
                                    ${parseFloat(t.Amount).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <section>
                <h3 className="text-lg font-semibold mb-2">Breakdown by Category</h3>
                <ul className="list-disc ml-6">
                    {Object.entries(byCategory).map(([cat, total]: any) => (
                        <li key={cat}>
                            {cat}: <strong>${total.toFixed(2)}</strong>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    );
}
