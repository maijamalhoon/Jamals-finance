import SwiftUI

struct RootView: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: "chart.line.uptrend.xyaxis.circle.fill")
                    .font(.system(size: 58))
                    .foregroundStyle(.blue)
                Text("Jamal's Finance")
                    .font(.title.bold())
                Text("Native iPhone shell is ready for the shared KMP framework and Keychain auth bridge.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
            }
            .padding(28)
        }
    }
}
