import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import catcop.catcop as fe


# --- Mock Dataset for Demonstration ---
class TripletGIFDataset(Dataset):

    def __init__(self, num_samples=100, max_frames=32, channels=3, h=128, w=128):
        self.num_samples = num_samples
        self.dims = (max_frames, channels, h, w)

    def __len__(self):
        return self.num_samples

    def __getitem__(self, idx):
        # In production, you would load the GIF from a file/URL here.
        # Anchor: The base GIF
        anchor = torch.randn(*self.dims)

        # Positive: The SAME GIF but with slight noise/augmentation applied
        positive = anchor + torch.randn(*self.dims) * 0.05

        # Negative: A completely different random GIF
        negative = torch.randn(*self.dims)

        return anchor, positive, negative


# Assuming GIFEmbeddingNetwork is imported or defined above
# from model import GIFEmbeddingNetwork


def train_embedding_model(epochs=5, batch_size=8, learning_rate=1e-4):
    # 1. Device selection (Use GPU if available, 3D CNNs are heavy!)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on device: {device}")

    # 2. Instantiate Model, Loss, and Optimizer
    model = fe.GIFEmbeddingNetwork(embedding_dim=512).to(device)
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)

    # margin=0.2 means Negatives must be at least 0.2 units further away than Positives
    criterion = nn.TripletMarginLoss(margin=0.2, p=2)

    # 3. Create Data Loaders
    dataset = TripletGIFDataset(num_samples=80)  # Using mock data
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    # 4. The Core Training Loop
    model.train()  # Set model to training mode
    for epoch in range(epochs):
        running_loss = 0.0

        for batch_idx, (anchors, positives, negatives) in enumerate(dataloader):
            # Move data tensors to the active device (CPU or GPU)
            anchors = anchors.to(device)
            positives = positives.to(device)
            negatives = negatives.to(device)

            # Zero out the parameter gradients from the previous step
            optimizer.zero_grad()

            # Forward pass: Generate embeddings for all three inputs
            anchor_embeds = model(anchors)
            positive_embeds = model(positives)
            negative_embeds = model(negatives)

            # Calculate Triplet Loss
            loss = criterion(anchor_embeds, positive_embeds, negative_embeds)

            # Backward pass: Compute gradients
            loss.backward()

            # Optimization step: Update weights
            optimizer.step()

            running_loss += loss.item()

        epoch_loss = running_loss / len(dataloader)
        print(f"Epoch [{epoch+1}/{epochs}] - Loss: {epoch_loss:.4f}")

    print("Training Complete!")
    return model
