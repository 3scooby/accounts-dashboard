export default function Report({ data }: { data: any[] }) {
    return (
        <div className="mt-8 bg-white shadow p-6 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Accounts Summary</h2>

            <p className="mb-4 text-gray-700">
                Total Accounts: <strong>{data.length}</strong>
            </p>

            <table className="min-w-full border text-sm">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="border p-2 text-left">Login</th>
                        <th className="border p-2 text-left">Name</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i}>
                            <td className="border p-2">{row.Login}</td>
                            <td className="border p-2">{row.Name}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
