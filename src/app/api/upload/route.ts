const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingId || !form.invoiceNumber || !form.vendorId) {
      toast.error('لطفاً فیلدهای الزامی را تکمیل کنید');
      return;
    }
    
    setSubmitting(true);
    try {
      // آماده‌سازی آیتم‌ها
      const itemsData = items
        .filter(row => row.materialName.trim() !== '')
        .map((row) => ({
          materialName: row.materialName,
          quantity: row.quantity,
          unit: row.unit,
          unitPrice: row.unitPrice,
          totalPrice: row.totalPrice,
        }));
      
      // ✅ فقط فایل‌های جدید رو آپلود کن
      let imageUrl: string | null | undefined = undefined;
      let pdfUrl: string | null | undefined = undefined;
      let waybillUrl: string | null | undefined = undefined;
      let deliveryReceiptUrl: string | null | undefined = undefined;
      
      if (files.image) {
        imageUrl = await uploadFileToBlob(files.image, 'invoices/images');
      }
      if (files.pdf) {
        pdfUrl = await uploadFileToBlob(files.pdf, 'invoices/pdfs');
      }
      if (files.waybill) {
        waybillUrl = await uploadFileToBlob(files.waybill, 'invoices/waybills');
      }
      if (files.deliveryReceipt) {
        deliveryReceiptUrl = await uploadFileToBlob(files.deliveryReceipt, 'invoices/deliveries');
      }
      
      let finalDescription = form.description || undefined;
      if (isCorrective) {
        finalDescription = finalDescription 
          ? `اصلاحی - ${finalDescription}` 
          : 'اصلاحی';
      }
      
      const updateBody: any = {
        id: editingId,
        invoiceNumber: form.invoiceNumber,
        projectId: form.projectId || undefined,
        supplierId: form.vendorId,
        purchaseDate: form.date,
        dueDate: form.dueDate,
        totalAmount: itemsTotal,
        paidAmount: 0,
        description: finalDescription,
        paymentMethod: form.paymentMethod || null,
        settlementDate: form.settlementDate || null,
        taxAmount: parseFloat(form.taxAmount) || 0,
        items: itemsData,
      };
      
      // ✅ فقط فیلدهایی که مقدار دارند را اضافه کن
      if (imageUrl !== undefined) updateBody.invoiceImageUrl = imageUrl;
      if (pdfUrl !== undefined) updateBody.pdfUrl = pdfUrl;
      if (waybillUrl !== undefined) updateBody.waybillUrl = waybillUrl;
      if (deliveryReceiptUrl !== undefined) updateBody.deliveryReceiptUrl = deliveryReceiptUrl;
      
      const response = await fetch('/api/invoices', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast.success('فاکتور با موفقیت ویرایش شد');
        setViewMode('list');
        setEditingId(null);
        resetForm();
        loadData();
      } else {
        toast.error(result.error || 'خطا در ویرایش فاکتور');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('خطا در ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };